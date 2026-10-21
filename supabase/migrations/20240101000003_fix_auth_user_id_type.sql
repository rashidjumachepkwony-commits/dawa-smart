-- =============================================================
-- Dawa Smart — Fix: Change auth_user_id and owner_id to TEXT
-- =============================================================
-- The Worker's legacy auth system uses text-based user IDs (e.g., 'user_rashidjuma')
-- but the pharmacy_members table had auth_user_id as uuid, causing:
--   "invalid input syntax for type uuid: user_rashidjuma"
--
-- This fix changes auth_user_id to text for compatibility with
-- the existing legacy auth system.
-- =============================================================

-- ─── Fix role check constraint ─────────────────────────────────
-- Add 'developer' to allowed roles in pharmacy_members
alter table public.pharmacy_members drop constraint if exists pharmacy_members_role_check;
alter table public.pharmacy_members add constraint pharmacy_members_role_check
  check (role in ('owner', 'admin', 'manager', 'pharmacist', 'cashier', 'lab', 'doctor', 'demo', 'developer'));

comment on column public.pharmacy_members.auth_user_id is 'Text-based user ID (legacy auth support: user_rashidjuma, user_demo)';
comment on column public.pharmacies.owner_id is 'Text-based user ID (legacy auth support)';

-- ─── Step 1: Drop ALL policies that depend on auth_user_id ──────
-- Must drop policies before dropping the column

-- Pharmacy policies
drop policy if exists "pharmacies_select_member" on public.pharmacies;
drop policy if exists "pharmacies_insert_owner" on public.pharmacies;
drop policy if exists "pharmacies_update_owner" on public.pharmacies;

-- Pharmacy_members policies
drop policy if exists "pharmacy_members_select_self" on public.pharmacy_members;
drop policy if exists "pharmacy_members_insert_owner_admin" on public.pharmacy_members;
drop policy if exists "pharmacy_members_update_owner_admin" on public.pharmacy_members;
drop policy if exists "pharmacy_members_prevent_pharmacy_change" on public.pharmacy_members;

-- Products policies
drop policy if exists "products_select_member" on public.products;
drop policy if exists "products_insert_member_write" on public.products;
drop policy if exists "products_update_member_write" on public.products;
drop policy if exists "products_delete_member_write" on public.products;

-- Sales policies
drop policy if exists "sales_select_member" on public.sales;
drop policy if exists "sales_insert_member_active" on public.sales;
drop policy if exists "sales_update_owner_admin" on public.sales;

-- Sale items policies
drop policy if exists "sale_items_select_member" on public.sale_items;
drop policy if exists "sale_items_insert_member" on public.sale_items;

-- Batches policies
drop policy if exists "batches_select_member" on public.batches;
drop policy if exists "batches_write_member_admin" on public.batches;

-- Patients policies
drop policy if exists "patients_select_member" on public.patients;
drop policy if exists "patients_insert_member_active" on public.patients;
drop policy if exists "patients_update_member_active" on public.patients;

-- Lab Tests policies
drop policy if exists "lab_tests_select_member" on public.lab_tests;
drop policy if exists "lab_tests_insert_member_active" on public.lab_tests;
drop policy if exists "lab_tests_update_member_active" on public.lab_tests;

-- Expenses policies
drop policy if exists "expenses_select_member" on public.expenses;
drop policy if exists "expenses_insert_member_admin" on public.expenses;
drop policy if exists "expenses_update_member_admin" on public.expenses;
drop policy if exists "expenses_delete_member_admin" on public.expenses;

-- Controlled Logs policies
drop policy if exists "controlled_logs_select_member" on public.controlled_logs;
drop policy if exists "controlled_logs_insert_member_pharmacist" on public.controlled_logs;

-- ─── Step 2: Drop and recreate columns ──────────────────────────

-- pharmacy_members.auth_user_id
alter table public.pharmacy_members drop constraint if exists pharmacy_members_auth_user_id_fkey;
alter table public.pharmacy_members drop column if exists auth_user_id;
alter table public.pharmacy_members add column auth_user_id text;

-- pharmacies.owner_id
alter table public.pharmacies drop constraint if exists pharmacies_owner_id_fkey;
alter table public.pharmacies drop column if exists owner_id;
alter table public.pharmacies add column owner_id text;

-- ─── Step 3: Recreate indexes ───────────────────────────────────
create index if not exists idx_pharmacy_members_user_text on public.pharmacy_members(auth_user_id);
create index if not exists idx_pharmacy_members_user on public.pharmacy_members(auth_user_id);

-- ─── Step 4: Add comments ───────────────────────────────────────
comment on column public.pharmacy_members.auth_user_id is 'Text-based user ID (legacy auth support: user_rashidjuma, user_demo)';
comment on column public.pharmacies.owner_id is 'Text-based user ID (legacy auth support)';

-- ─── Step 5: Recreate policies ─────────────────────────────────
-- All policies remain the same except they now work with text auth_user_id
-- The Worker uses service_role which bypasses RLS, so these policies
-- only matter for direct client access

-- Pharmacy members can READ their pharmacy
create policy "pharmacies_select_member" on public.pharmacies
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = pharmacies.id
      and pm.status = 'active'
    )
  );

-- Only owners can INSERT pharmacies (during registration)
create policy "pharmacies_insert_owner" on public.pharmacies
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.role = 'owner'
      and pm.status = 'active'
    )
    or
    (owner_id = auth.uid()::text AND NOT EXISTS (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
    ))
  );

-- Only owners can UPDATE pharmacies
create policy "pharmacies_update_owner" on public.pharmacies
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = pharmacies.id
      and pm.role = 'owner'
      and pm.status = 'active'
    )
  );

-- Pharmacy members can read their own memberships
create policy "pharmacy_members_select_self" on public.pharmacy_members
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = pharmacy_members.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Only owners/admins can insert/update memberships (invitations)
create policy "pharmacy_members_insert_owner_admin" on public.pharmacy_members
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = pharmacy_members.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  );

create policy "pharmacy_members_update_owner_admin" on public.pharmacy_members
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = pharmacy_members.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = pharmacy_members.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  );

-- Prevent changing pharmacy_id on UPDATE
create policy "pharmacy_members_prevent_pharmacy_change" on public.pharmacy_members
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = pharmacy_members.pharmacy_id
      and pm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.pharmacy_members existing
      where existing.id = pharmacy_members.id
      and existing.pharmacy_id = pharmacy_members.pharmacy_id
    )
  );

-- Products: workspace-scoped
create policy "products_select_member" on public.products
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "products_insert_member_write" on public.products
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      join public.pharmacies p on p.id = pm.pharmacy_id
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

create policy "products_update_member_write" on public.products
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

create policy "products_delete_member_write" on public.products
  for delete using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

-- Sales: workspace-scoped
create policy "sales_select_member" on public.sales
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = sales.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "sales_insert_member_active" on public.sales
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = sales.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "sales_update_owner_admin" on public.sales
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = sales.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin')
    )
  );

-- Sale Items: workspace-scoped
create policy "sale_items_select_member" on public.sale_items
  for select using (
    exists (
      select 1 from public.sales s
      join public.pharmacy_members pm on pm.pharmacy_id = s.pharmacy_id
      where s.id = sale_items.sale_id
      and s.deleted_at is null
      and pm.auth_user_id = auth.uid()::text
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
      and pm.auth_user_id = auth.uid()::text
      and pm.status = 'active'
    )
  );

-- Batches: workspace-scoped
create policy "batches_select_member" on public.batches
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = batches.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "batches_write_member_admin" on public.batches
  for all using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = batches.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  )
  with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = batches.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

-- Patients: workspace-scoped
create policy "patients_select_member" on public.patients
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = patients.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "patients_insert_member_active" on public.patients
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = patients.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "patients_update_member_active" on public.patients
  for update with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = patients.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Lab Tests: workspace-scoped
create policy "lab_tests_select_member" on public.lab_tests
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = lab_tests.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "lab_tests_insert_member_active" on public.lab_tests
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = lab_tests.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "lab_tests_update_member_active" on public.lab_tests
  for update with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = lab_tests.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Expenses: workspace-scoped
create policy "expenses_select_member" on public.expenses
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = expenses.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "expenses_insert_member_admin" on public.expenses
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = expenses.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager')
    )
  );

create policy "expenses_update_member_admin" on public.expenses
  for update with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = expenses.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager')
    )
  );

create policy "expenses_delete_member_admin" on public.expenses
  for delete using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = expenses.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager')
    )
  );

-- Controlled Logs: workspace-scoped
create policy "controlled_logs_select_member" on public.controlled_logs
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = controlled_logs.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "controlled_logs_insert_member_pharmacist" on public.controlled_logs
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = controlled_logs.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'pharmacist')
    )
  );
