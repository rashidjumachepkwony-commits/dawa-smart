-- =============================================================
-- Dawa Smart — Supabase Database Schema
-- =============================================================
-- This migration creates the central online PostgreSQL database.
-- It mirrors the existing IndexedDB schema (YetuPharmcareDB v4).
-- 
-- Tables:
--   1. users         — system users (mirrors localStorage yetu_users)
--   2. products      — inventory items
--   3. batches       — product batch tracking with expiry
--   4. sales         — sales transactions
--   5. sale_items    — individual sale line items
--   6. patients      — patient/customer records (EMR)
--   7. lab_tests     — laboratory test records
--   8. expenses      — business expenses
--   9. controlled_logs — controlled drug access logs
--
-- Shared columns on all tables:
--   - id              — UUID or generated ID
--   - created_at      — server timestamp (default now())
--   - updated_at      — auto-updated on write
--   - deleted_at      — tombstone for soft deletes (for sync safety)
--   - revision        — integer for optimistic concurrency
--
-- Row Level Security (RLS) is enabled on ALL tables.
-- Policies use the user's role (from JWT claims) for authorization.
-- =============================================================

-- ─── Enable required extensions ──────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Common trigger for updated_at ───────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

-- ─── Users ────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password_hash text not null, -- server-side only; never stored via client
  full_name text not null,
  email text,
  phone text,
  role text check (
    role in ('developer', 'admin', 'manager', 'pharmacist', 'lab', 'doctor', 'cashier', 'demo')
  ) not null default 'cashier',
  status text check (status in ('active', 'inactive', 'pending')) not null default 'pending',
  pharmacy text,
  verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
  before update on public.users
  for each row execute function update_updated_at();

-- ─── Products ─────────────────────────────────────────────────
create table if not exists public.products (
  id text primary key,
  name text not null,
  sku text,
  category text,
  unit text,
  buying_price numeric default 0,
  selling_price numeric default 0,
  quantity integer default 0,
  expiry_date date,
  generic text,
  controlled boolean default false,
  badge text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

drop trigger if exists update_products_updated_at on public.products;
create trigger update_products_updated_at
  before update on public.products
  for each row execute function update_updated_at();

create index if not exists idx_products_deleted on public.products(deleted_at) where deleted_at is null;
create index if not exists idx_products_category on public.products(category);

-- ─── Batches ──────────────────────────────────────────────────
create table if not exists public.batches (
  id text primary key,
  product_id text references public.products(id) on delete cascade,
  product_name text,
  batch_number text,
  expiry_date date,
  quantity integer default 0,
  buying_price numeric default 0,
  selling_price numeric default 0,
  supplier text,
  received_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

drop trigger if exists update_batches_updated_at on public.batches;
create trigger update_batches_updated_at
  before update on public.batches
  for each row execute function update_updated_at();
create index if not exists idx_batches_product on public.batches(product_id);
create index if not exists idx_batches_expiry on public.batches(expiry_date);

-- ─── Sales ────────────────────────────────────────────────────
create table if not exists public.sales (
  id text primary key,
  customer text,
  customer_phone text,
  customer_id_number text,
  subtotal numeric default 0,
  original_subtotal numeric default 0,
  vat numeric default 0,
  total numeric not null,
  payment numeric default 0,
  change_amount numeric default 0,
  method text check (
    method in ('cash', 'mpesa', 'airtel', 'card', 'insurance', 'credit')
  ),
  cashier text,
  receipt_number text,
  customer_id text,
  credit_amount numeric default 0,
  negotiated boolean default false,
  original_total numeric default 0,
  is_backdated boolean default false,
  sale_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

drop trigger if exists update_sales_updated_at on public.sales;
create trigger update_sales_updated_at
  before update on public.sales
  for each row execute function update_updated_at();
create index if not exists idx_sales_date on public.sales(sale_date desc);
create index if not exists idx_sales_method on public.sales(method);
create index if not exists idx_sales_customer on public.sales(customer_id);

-- ─── Sale Items ───────────────────────────────────────────────
create table if not exists public.sale_items (
  id text primary key,
  sale_id text references public.sales(id) on delete cascade,
  product_id text,
  quantity integer not null,
  price numeric not null,
  original_price numeric,
  buying_price numeric default 0,
  name text,
  controlled boolean default false,
  is_negotiated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

drop trigger if exists update_sale_items_updated_at on public.sale_items;
create trigger update_sale_items_updated_at
  before update on public.sale_items
  for each row execute function update_updated_at();
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);

-- ─── Patients ─────────────────────────────────────────────────
create table if not exists public.patients (
  id text primary key,
  first_name text not null,
  last_name text,
  phone text,
  email text,
  dob date,
  gender text check (gender in ('male', 'female', 'other')),
  credit numeric default 0,
  credit_limit numeric default 10000,
  history text,
  insurance text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

drop trigger if exists update_patients_updated_at on public.patients;
create trigger update_patients_updated_at
  before update on public.patients
  for each row execute function update_updated_at();
create index if not exists idx_patients_name on public.patients(first_name, last_name);

-- ─── Lab Tests ────────────────────────────────────────────────
create table if not exists public.lab_tests (
  id text primary key,
  patient_name text,
  test_type text,
  requested_by text,
  notes text,
  status text check (
    status in ('pending', 'in-progress', 'completed', 'cancelled')
  ) default 'pending',
  results text,
  test_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

drop trigger if exists update_lab_tests_updated_at on public.lab_tests;
create trigger update_lab_tests_updated_at
  before update on public.lab_tests
  for each row execute function update_updated_at();
create index if not exists idx_lab_tests_status on public.lab_tests(status);
create index if not exists idx_lab_tests_date on public.lab_tests(test_date desc);

-- ─── Expenses ─────────────────────────────────────────────────
create table if not exists public.expenses (
  id text primary key,
  type text,
  amount numeric not null,
  description text,
  expense_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

drop trigger if exists update_expenses_updated_at on public.expenses;
create trigger update_expenses_updated_at
  before update on public.expenses
  for each row execute function update_updated_at();
create index if not exists idx_expenses_date on public.expenses(expense_date desc);

-- ─── Controlled Logs ──────────────────────────────────────────
create table if not exists public.controlled_logs (
  id text primary key,
  product_id text,
  action text,
  user_name text,
  quantity integer,
  timestamp timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

drop trigger if exists update_controlled_logs_updated_at on public.controlled_logs;
create trigger update_controlled_logs_updated_at
  before update on public.controlled_logs
  for each row execute function update_updated_at();

-- ─── Enable Row Level Security on ALL tables ──────────────────
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.batches enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.patients enable row level security;
alter table public.lab_tests enable row level security;
alter table public.expenses enable row level security;
alter table public.controlled_logs enable row level security;

-- ─── RLS Policies ─────────────────────────────────────────────
-- Developers and admins have full access
-- Demo users can read all and write to non-sensitive tables
-- Cashiers/staff have limited access

-- Drop existing policies (for re-runs)
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_admin_only" on public.users;
drop policy if exists "users_update_admin_only" on public.users;
drop policy if exists "products_select_all" on public.products;
drop policy if exists "products_insert_admin_plus" on public.products;
drop policy if exists "products_update_admin_plus" on public.products;
drop policy if exists "products_delete_admin_plus" on public.products;
drop policy if exists "products_select_member" on public.products;
drop policy if exists "products_insert_member_write" on public.products;
drop policy if exists "products_update_member_write" on public.products;
drop policy if exists "products_delete_member_write" on public.products;
drop policy if exists "sales_select_all" on public.sales;
drop policy if exists "sales_insert_all" on public.sales;
drop policy if exists "sales_update_admin_plus" on public.sales;
drop policy if exists "sales_select_member" on public.sales;
drop policy if exists "sales_insert_member_active" on public.sales;
drop policy if exists "sales_update_owner_admin" on public.sales;
drop policy if exists "batches_select_all" on public.batches;
drop policy if exists "batches_write_admin_plus" on public.batches;
drop policy if exists "batches_select_member" on public.batches;
drop policy if exists "batches_write_member_admin" on public.batches;
drop policy if exists "sale_items_select_all" on public.sale_items;
drop policy if exists "sale_items_insert_all" on public.sale_items;
drop policy if exists "sale_items_select_member" on public.sale_items;
drop policy if exists "sale_items_insert_member" on public.sale_items;
drop policy if exists "patients_select_all" on public.patients;
drop policy if exists "patients_insert_all" on public.patients;
drop policy if exists "patients_update_all" on public.patients;
drop policy if exists "patients_select_member" on public.patients;
drop policy if exists "patients_insert_member_active" on public.patients;
drop policy if exists "patients_update_member_active" on public.patients;
drop policy if exists "lab_tests_select_all" on public.lab_tests;
drop policy if exists "lab_tests_insert_all" on public.lab_tests;
drop policy if exists "lab_tests_update_all" on public.lab_tests;
drop policy if exists "lab_tests_select_member" on public.lab_tests;
drop policy if exists "lab_tests_insert_member_active" on public.lab_tests;
drop policy if exists "lab_tests_update_member_active" on public.lab_tests;
drop policy if exists "expenses_select_all" on public.expenses;
drop policy if exists "expenses_write_admin_plus" on public.expenses;
drop policy if exists "expenses_select_member" on public.expenses;
drop policy if exists "expenses_insert_member_admin" on public.expenses;
drop policy if exists "expenses_update_member_admin" on public.expenses;
drop policy if exists "expenses_delete_member_admin" on public.expenses;
drop policy if exists "controlled_logs_select_all" on public.controlled_logs;
drop policy if exists "controlled_logs_write_pharmacist_plus" on public.controlled_logs;
drop policy if exists "controlled_logs_select_member" on public.controlled_logs;
drop policy if exists "controlled_logs_insert_member_pharmacist" on public.controlled_logs;
drop policy if exists "pharmacies_select_member" on public.pharmacies;
drop policy if exists "pharmacies_insert_owner" on public.pharmacies;
drop policy if exists "pharmacies_update_owner" on public.pharmacies;
drop policy if exists "pharmacy_members_select_self" on public.pharmacy_members;
drop policy if exists "pharmacy_members_insert_owner_admin" on public.pharmacy_members;
drop policy if exists "pharmacy_members_update_owner_admin" on public.pharmacy_members;
drop policy if exists "pharmacy_members_prevent_pharmacy_change" on public.pharmacy_members;

-- Users table — only developers/admins can manage users
create policy "users_select_own" on public.users
  for select using (
    auth.uid() = id OR
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin')
    )
  );

create policy "users_insert_admin_only" on public.users
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin')
    )
  );

create policy "users_update_admin_only" on public.users
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin')
    )
  );

-- Products — all authenticated users can read; admin+ can write
create policy "products_select_all" on public.products
  for select using (
    exists (select 1 from public.users where id = auth.uid())
    and (deleted_at is null)
  );

create policy "products_insert_admin_plus" on public.products
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin', 'manager', 'pharmacist')
    )
  );

create policy "products_update_admin_plus" on public.products
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin', 'manager', 'pharmacist')
    )
  );

create policy "products_delete_admin_plus" on public.products
  for delete using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin', 'manager', 'pharmacist')
    )
  );

-- Sales — all authenticated users can read; all can create; only admin+ can edit/delete
create policy "sales_select_all" on public.sales
  for select using (
    exists (select 1 from public.users where id = auth.uid())
    and (deleted_at is null)
  );

create policy "sales_insert_all" on public.sales
  for insert with check (
    exists (select 1 from public.users where id = auth.uid())
  );

create policy "sales_update_admin_plus" on public.sales
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin', 'manager', 'pharmacist')
    )
  );

-- Batches
create policy "batches_select_all" on public.batches
  for select using (
    exists (select 1 from public.users where id = auth.uid())
    and (deleted_at is null)
  );

create policy "batches_write_admin_plus" on public.batches
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin', 'manager', 'pharmacist')
    )
  );

-- Patients
create policy "patients_select_all" on public.patients
  for select using (
    exists (select 1 from public.users where id = auth.uid())
    and (deleted_at is null)
  );

create policy "patients_insert_all" on public.patients
  for insert with check (
    exists (select 1 from public.users where id = auth.uid())
  );

create policy "patients_update_all" on public.patients
  for update with check (
    exists (select 1 from public.users where id = auth.uid())
  );

-- Lab Tests
create policy "lab_tests_select_all" on public.lab_tests
  for select using (
    exists (select 1 from public.users where id = auth.uid())
    and (deleted_at is null)
  );

create policy "lab_tests_insert_all" on public.lab_tests
  for insert with check (
    exists (select 1 from public.users where id = auth.uid())
  );

create policy "lab_tests_update_all" on public.lab_tests
  for update with check (
    exists (select 1 from public.users where id = auth.uid())
  );

-- Expenses
create policy "expenses_select_all" on public.expenses
  for select using (
    exists (select 1 from public.users where id = auth.uid())
    and (deleted_at is null)
  );

create policy "expenses_write_admin_plus" on public.expenses
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin', 'manager')
    )
  );

-- Controlled Logs — read-only for most, write for pharmacists+
create policy "controlled_logs_select_all" on public.controlled_logs
  for select using (
    exists (select 1 from public.users where id = auth.uid())
  );

create policy "controlled_logs_write_pharmacist_plus" on public.controlled_logs
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('developer', 'admin', 'pharmacist')
    )
  );

-- Sale Items — follow parent sale permissions
create policy "sale_items_select_all" on public.sale_items
  for select using (
    exists (
      select 1 from public.sales s
      join public.users u on u.id = auth.uid()
      where s.id = sale_items.sale_id
      and s.deleted_at is null
    )
  );

create policy "sale_items_insert_all" on public.sale_items
  for insert with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
      and s.cashier = (select full_name from public.users where id = auth.uid())
    )
  );

-- ─── Realtime (optional) ──────────────────────────────────────
-- Enable realtime on tables that need live updates
-- In production: addsupabase realtime publications as needed
