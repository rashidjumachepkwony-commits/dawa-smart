-- Dawa Smart auth migration verification
-- Run this in the Supabase SQL Editor or with psql against the production/staging database.
-- Purpose: validate the live schema assumptions behind
-- supabase/migrations/20240101000003_fix_auth_user_id_type.sql

-- 1) Check the actual live column types for the auth identity fields.
SELECT
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('pharmacy_members', 'pharmacies')
  AND column_name IN ('auth_user_id', 'owner_id')
ORDER BY table_name, column_name;

-- 2) Check whether any remaining UUID-based auth assumptions still exist in the public policy definitions.
SELECT
  schemaname,
  tablename,
  policyname,
  qual,
  with_check,
  CASE
    WHEN qual ILIKE '%auth.uid()::text%' OR with_check ILIKE '%auth.uid()::text%' THEN 'uses_text_auth_uid'
    WHEN qual ILIKE '%auth.uid()::uuid%' OR with_check ILIKE '%auth.uid()::uuid%' THEN 'uses_uuid_auth_uid'
    WHEN qual ILIKE '%auth.uid()%' OR with_check ILIKE '%auth.uid()%' THEN 'uses_auth_uid_without_explicit_cast'
    ELSE 'no_auth_uid_reference'
  END AS auth_uid_pattern
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'pharmacies',
    'pharmacy_members',
    'products',
    'sales',
    'sale_items',
    'batches',
    'patients',
    'lab_tests',
    'expenses',
    'controlled_logs',
    'suppliers',
    'drug_categories',
    'drug_forms',
    'drugs',
    'drug_batches',
    'drug_stock_movements',
    'report_archives'
  )
ORDER BY tablename, policyname;

-- 3) Check the actual table constraints / relationship state around the auth fields.
SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.pharmacy_members'::regclass
   OR conrelid = 'public.pharmacies'::regclass
ORDER BY conrelid::regclass::text, conname;

-- 4) Confirm critical indexes exist for the text-based auth identifiers.
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename = 'pharmacy_members'
    OR tablename = 'pharmacies'
  )
  AND (
    indexdef ILIKE '%auth_user_id%'
    OR indexdef ILIKE '%owner_id%'
  )
ORDER BY tablename, indexname;

-- 5) Final status summary: fail if the live schema is still UUID-based or if policies still assume UUID auth ids.
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'pharmacy_members'
        AND c.column_name = 'auth_user_id'
        AND c.data_type <> 'text'
    )
    OR EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'pharmacies'
        AND c.column_name = 'owner_id'
        AND c.data_type <> 'text'
    )
    THEN 'FAIL: live schema still expects UUID-based identifiers for auth_user_id/owner_id'
    ELSE 'PASS: public schema matches text-based auth identity assumptions'
  END AS schema_status;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (
          qual ILIKE '%auth.uid()::uuid%'
          OR with_check ILIKE '%auth.uid()::uuid%'
          OR qual ILIKE '%auth.uid()::uuid %'
          OR with_check ILIKE '%auth.uid()::uuid %'
        )
    )
    THEN 'FAIL: at least one policy still assumes auth.uid() is uuid'
    ELSE 'PASS: policy checks do not appear to use UUID casts for auth.uid()'
  END AS policy_status;

-- 6) Optional: show whether the table-level role check contains the expected developer role.
SELECT
  conname AS role_constraint_name,
  pg_get_constraintdef(oid) AS role_constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.pharmacy_members'::regclass
  AND conname ILIKE '%role%';

-- Notes:
-- - If the live DB is still on the UUID version, this script will report FAIL.
-- - If values like 'user_rashidjuma' are used for auth_user_id, they are text IDs and must remain text.
-- - If a policy is still checking auth.uid()::uuid, the migration must be corrected or rolled back before production release.
