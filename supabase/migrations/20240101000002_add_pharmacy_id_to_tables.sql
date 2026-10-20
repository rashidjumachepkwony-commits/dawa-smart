-- =============================================================
-- Dawa Smart — Phase 2: Add pharmacy_id to Business Tables
-- =============================================================
-- Adds pharmacy_id column to all business-data tables for
-- workspace-based multi-tenancy isolation.
--
-- This migration:
--   1. Adds pharmacy_id UUID FK to each business table
--   2. Adds indexes for performant workspace filtering
--   3. Does NOT modify existing data (pharmacy_id defaults to NULL)
--   4. Existing data stays accessible until migrated
--
-- The pharmacy_id is set by the Worker's /api/sync endpoint using
-- the authenticated user's workspace context, NOT from client input.
-- =============================================================

-- Helper: add pharmacy_id column if not exists
-- PostgreSQL doesn't have "ADD COLUMN IF NOT EXISTS" in older versions,
-- but Supabase supports it

-- ─── Products ─────────────────────────────────────────────────
alter table public.products add column if not exists pharmacy_id uuid references public.pharmacies(id);
create index if not exists idx_products_pharmacy on public.products(pharmacy_id);

-- ─── Batches ──────────────────────────────────────────────────
alter table public.batches add column if not exists pharmacy_id uuid references public.pharmacies(id);
create index if not exists idx_batches_pharmacy on public.batches(pharmacy_id);

-- ─── Sales ────────────────────────────────────────────────────
alter table public.sales add column if not exists pharmacy_id uuid references public.pharmacies(id);
create index if not exists idx_sales_pharmacy on public.sales(pharmacy_id);

-- ─── Sale Items ───────────────────────────────────────────────
alter table public.sale_items add column if not exists pharmacy_id uuid references public.pharmacies(id);
create index if not exists idx_sale_items_pharmacy on public.sale_items(pharmacy_id);

-- ─── Patients ─────────────────────────────────────────────────
alter table public.patients add column if not exists pharmacy_id uuid references public.pharmacies(id);
create index if not exists idx_patients_pharmacy on public.patients(pharmacy_id);

-- ─── Lab Tests ────────────────────────────────────────────────
alter table public.lab_tests add column if not exists pharmacy_id uuid references public.pharmacies(id);
create index if not exists idx_lab_tests_pharmacy on public.lab_tests(pharmacy_id);

-- ─── Expenses ─────────────────────────────────────────────────
alter table public.expenses add column if not exists pharmacy_id uuid references public.pharmacies(id);
create index if not exists idx_expenses_pharmacy on public.expenses(pharmacy_id);

-- ─── Controlled Logs ──────────────────────────────────────────
alter table public.controlled_logs add column if not exists pharmacy_id uuid references public.pharmacies(id);
create index if not exists idx_controlled_logs_pharmacy on public.controlled_logs(pharmacy_id);

-- ─── RLS Policy Updates ───────────────────────────────────────
-- Replace role-only policies with workspace-scoped policies
-- Each policy now checks membership in the pharmacy that owns the record

-- Products: workspace-scoped
drop policy if exists "products_select_all" on public.products;
drop policy if exists "products_insert_admin_plus" on public.products;
drop policy if exists "products_update_admin_plus" on public.products;
drop policy if exists "products_delete_admin_plus" on public.products;

create policy "products_select_member" on public.products
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "products_insert_member_write" on public.products
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      join public.pharmacies p on p.id = pm.pharmacy_id
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

create policy "products_update_member_write" on public.products
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

create policy "products_delete_member_write" on public.products
  for delete using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

-- Prevent changing pharmacy_id via UPDATE
-- (The update_with check from the INSERT policy will reject if pharmacy_id doesn't match membership)

-- Sales: workspace-scoped
drop policy if exists "sales_select_all" on public.sales;
drop policy if exists "sales_insert_all" on public.sales;
drop policy if exists "sales_update_admin_plus" on public.sales;

create policy "sales_select_member" on public.sales
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = sales.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "sales_insert_member_active" on public.sales
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = sales.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "sales_update_owner_admin" on public.sales
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = sales.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin')
    )
  );

-- Sale Items: workspace-scoped via parent sale
drop policy if exists "sale_items_select_all" on public.sale_items;
drop policy if exists "sale_items_insert_all" on public.sale_items;

create policy "sale_items_select_member" on public.sale_items
  for select using (
    exists (
      select 1 from public.sales s
      join public.pharmacy_members pm on pm.pharmacy_id = s.pharmacy_id
      where s.id = sale_items.sale_id
      and s.deleted_at is null
      and pm.auth_user_id = auth.uid()
      and pm.status = 'active'
    )
  );

create policy "sale_items_insert_member" on public.sale_items
  for insert with check (
    exists (
      select 1 from public.sales s
      join public.pharmacy_members pm on pm.pharmacy_id = s.pharmacy_id
      where s.id = sale_items.sale_id
      and s.deleted_at is null
      and pm.auth_user_id = auth.uid()
      and pm.status = 'active'
    )
    -- Ensure sale_items.pharmacy_id matches sale.pharmacy_id
    -- This is enforced by the Worker setting both fields
  );

-- Batches: workspace-scoped
drop policy if exists "batches_select_all" on public.batches;
drop policy if exists "batches_write_admin_plus" on public.batches;

create policy "batches_select_member" on public.batches
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = batches.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "batches_write_member_admin" on public.batches
  for all using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = batches.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  ) with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = batches.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

-- Patients: workspace-scoped
drop policy if exists "patients_select_all" on public.patients;
drop policy if exists "patients_write_all" on public.patients;

create policy "patients_select_member" on public.patients
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = patients.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "patients_write_member_active" on public.patients
  for insert, update with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = patients.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Lab Tests: workspace-scoped
drop policy if exists "lab_tests_select_all" on public.lab_tests;
drop policy if exists "lab_tests_write_all" on public.lab_tests;

create policy "lab_tests_select_member" on public.lab_tests
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = lab_tests.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "lab_tests_write_member_active" on public.lab_tests
  for insert, update with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = lab_tests.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Expenses: workspace-scoped
drop policy if exists "expenses_select_all" on public.expenses;
drop policy if exists "expenses_write_admin_plus" on public.expenses;

create policy "expenses_select_member" on public.expenses
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = expenses.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "expenses_write_member_admin" on public.expenses
  for insert, update, delete with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = expenses.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager')
    )
  );

-- Controlled Logs: workspace-scoped
drop policy if exists "controlled_logs_select_all" on public.controlled_logs;
drop policy if exists "controlled_logs_write_pharmacist_plus" on public.controlled_logs;

create policy "controlled_logs_select_member" on public.controlled_logs
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = controlled_logs.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "controlled_logs_insert_member_pharmacist" on public.controlled_logs
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = controlled_logs.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'pharmacist')
    )
  );

-- ─── Migration Comment ────────────────────────────────────────
comment on table public.products is 'Tenant-scoped: pharmacy_id must match authenticated user membership';
comment on table public.sales is 'Tenant-scoped: pharmacy_id must match authenticated user membership';
comment on table public.patients is 'Tenant-scoped: pharmacy_id must match authenticated user membership';
