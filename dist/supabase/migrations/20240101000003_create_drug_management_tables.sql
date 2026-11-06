-- =============================================================
-- Dawa Smart — Phase 3: Drug Management Tables
-- =============================================================
-- Creates specialized pharmaceutical inventory tables that complement
-- the existing products/batches structure with pharma-specific
-- attributes like drug forms, categories, FEFO batch tracking,
-- and an auditable stock movement history.
--
-- All tables follow the established conventions:
--   - pharmacy_id for multi-tenancy (workspace isolation)
--   - deleted_at for soft deletes (tombstone for sync safety)
--   - revision for optimistic concurrency
--   - updated_at auto-updated via trigger
--   - RLS enabled with workspace-scoped policies
--
-- Tables created:
--   1. drug_categories  — therapeutic classes (Antibiotics, Analgesics...)
--   2. drug_forms       — dosage forms (Tablet, Capsule, Syrup...)
--   3. drugs            — master drug definitions
--   4. drug_batches     — batch-level stock with expiry & purchase price
--   5. drug_stock_movements — auditable inventory transaction log
--   6. suppliers        — pharmacy supplier directory
--
-- Database functions:
--   - receive_drug_batch() — transactional stock receiving with FEFO
--   - deduct_drug_stock()  — FEFO-compliant stock deduction with audit
--   - get_drug_stock_summary() — current on-hand quantity per drug
--   - identify_expired_batches() — expiry flagging helper
-- =============================================================

-- ─── Enable required extensions ──────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Common trigger function for updated_at ──────────────────
-- (Re-created here for idempotency; matches init_schema.sql)
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

-- ─── Suppliers ────────────────────────────────────────────────
create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  phone text,
  email text,
  address text,
  license_number text,
  status text check (
    status in ('active', 'inactive')
  ) default 'active',
  pharmacy_id uuid references public.pharmacies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

create index if not exists idx_suppliers_pharmacy on public.suppliers(pharmacy_id) where deleted_at is null;
create index if not exists idx_suppliers_name on public.suppliers(name);

drop trigger if exists update_suppliers_updated_at on public.suppliers;
create trigger update_suppliers_updated_at
  before update on public.suppliers
  for each row execute function update_updated_at();

-- ─── Drug Categories ──────────────────────────────────────────
-- Therapeutic classes: Antibiotics, Analgesics, Antimalarials, etc.
create table if not exists public.drug_categories (
  id text primary key,
  name text not null,
  description text,
  status text check (
    status in ('active', 'inactive')
  ) default 'active',
  pharmacy_id uuid references public.pharmacies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

create index if not exists idx_drug_categories_pharmacy on public.drug_categories(pharmacy_id) where deleted_at is null;
create index if not exists idx_drug_categories_name on public.drug_categories(name);
create unique index if not exists idx_drug_categories_pharmacy_name
  on public.drug_categories(pharmacy_id, lower(name))
  where deleted_at is null;

drop trigger if exists update_drug_categories_updated_at on public.drug_categories;
create trigger update_drug_categories_updated_at
  before update on public.drug_categories
  for each row execute function update_updated_at();

-- ─── Drug Forms ───────────────────────────────────────────────
-- Dosage forms: Tablet, Capsule, Oral Suspension, Syrup, etc.
create table if not exists public.drug_forms (
  id text primary key,
  name text not null,
  description text,
  status text check (
    status in ('active', 'inactive')
  ) default 'active',
  pharmacy_id uuid references public.pharmacies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

create index if not exists idx_drug_forms_pharmacy on public.drug_forms(pharmacy_id) where deleted_at is null;
create index if not exists idx_drug_forms_name on public.drug_forms(name);
create unique index if not exists idx_drug_forms_pharmacy_name
  on public.drug_forms(pharmacy_id, lower(name))
  where deleted_at is null;

drop trigger if exists update_drug_forms_updated_at on public.drug_forms;
create trigger update_drug_forms_updated_at
  before update on public.drug_forms
  for each row execute function update_updated_at();

-- ─── Drugs (Master Catalogue) ─────────────────────────────────
-- Drug definitions linking to category and form.
-- Supports multiple brands, strengths, and dosage forms.
create table if not exists public.drugs (
  id text primary key,
  drug_name text not null,
  generic_name text,
  brand_name text,
  strength text, -- e.g., "500mg", "250ml", "10mg/ml"
  category_id text references public.drug_categories(id) on delete set null,
  form_id text references public.drug_forms(id) on delete set null,
  route_of_administration text, -- e.g., "Oral", "IV", "Topical", "Inhalation"
  manufacturer text,
  barcode text,
  registration_number text, -- KRA/Pharmacy Board registration
  prescription_status text check (
    prescription_status in ('otc', 'pharmacy', 'prescription')
  ) default 'pharmacy',
  description text,
  reorder_level integer default 0,
  status text check (
    status in ('active', 'inactive')
  ) default 'active',
  pharmacy_id uuid references public.pharmacies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

create index if not exists idx_drugs_pharmacy on public.drugs(pharmacy_id) where deleted_at is null;
create index if not exists idx_drugs_category on public.drugs(category_id);
create index if not exists idx_drugs_form on public.drugs(form_id);
create index if not exists idx_drugs_name on public.drugs(drug_name);
create index if not exists idx_drugs_generic on public.drugs(generic_name);
create index if not exists idx_drugs_barcode on public.drugs(barcode);
create index if not exists idx_drugs_reorder on public.drugs(reorder_level) where deleted_at is null;

drop trigger if exists update_drugs_updated_at on public.drugs;
create trigger update_drugs_updated_at
  before update on public.drugs
  for each row execute function update_updated_at();

-- ─── Drug Batches (Lot-Level Inventory) ───────────────────────
-- Each batch represents a physical receipt of a drug from a supplier.
-- FEFO (First Expiry, First Out) is enforced at the application layer
-- by ordering by expiry_date when deducting stock.
create table if not exists public.drug_batches (
  id text primary key,
  drug_id text references public.drugs(id) on delete cascade,
  batch_number text not null,
  manufacturing_date date,
  expiry_date date not null,
  quantity_received integer default 0,
  quantity_remaining integer default 0,
  purchase_price numeric default 0,  -- per-unit buying cost
  selling_price numeric default 0,    -- per-unit selling price
  total_cost numeric default 0,       -- purchase_price * quantity_received
  supplier_id text references public.suppliers(id) on delete set null,
  supplier_name text,
  supplier_phone text,
  received_date date,
  status text check (
    status in ('active', 'expired', 'dispensed', 'destroyed')
  ) default 'active',
  pharmacy_id uuid references public.pharmacies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  revision integer default 0
);

create index if not exists idx_drug_batches_pharmacy on public.drug_batches(pharmacy_id) where deleted_at is null;
create index if not exists idx_drug_batches_drug on public.drug_batches(drug_id);
create index if not exists idx_drug_batches_expiry on public.drug_batches(expiry_date);
create index if not exists idx_drug_batches_status on public.drug_batches(status);
create index if not exists idx_drug_batches_supplier on public.drug_batches(supplier_id);
-- Prevent duplicate batch entries within the same pharmacy and drug
create unique index if not exists idx_drug_batches_pharmacy_drug_batch
  on public.drug_batches(pharmacy_id, drug_id, batch_number)
  where deleted_at is null;

drop trigger if exists update_drug_batches_updated_at on public.drug_batches;
create trigger update_drug_batches_updated_at
  before update on public.drug_batches
  for each row execute function update_updated_at();

-- ─── Drug Stock Movements (Audit Trail) ───────────────────────
-- Records every addition, deduction, disposal, or adjustment
-- to batch stock levels for auditability.
create table if not exists public.drug_stock_movements (
  id text primary key,
  drug_id text references public.drugs(id) on delete cascade,
  batch_id text references public.drug_batches(id) on delete set null,
  movement_type text check (
    movement_type in ('receive', 'sell', 'return', 'adjust', 'destroy', 'transfer')
  ) not null,
  quantity integer not null, -- positive = increase, negative = decrease
  quantity_before integer,
  quantity_after integer,
  unit_price numeric,
  reference_id text, -- e.g., sale_id, adjustment reason ID
  reference_type text, -- e.g., 'sale', 'adjustment'
  notes text,
  user_name text,
  pharmacy_id uuid references public.pharmacies(id),
  created_at timestamptz default now()
);

create index if not exists idx_drug_stock_movements_pharmacy on public.drug_stock_movements(pharmacy_id);
create index if not exists idx_drug_stock_movements_drug on public.drug_stock_movements(drug_id);
create index if not exists idx_drug_stock_movements_batch on public.drug_stock_movements(batch_id);
create index if not exists idx_drug_stock_movements_date on public.drug_stock_movements(created_at desc);

-- ─── Link existing products to drugs (optional integration) ───
-- Adds an optional drug_id foreign key to the existing products table
-- so POS cart items can reference drug batches for FEFO deduction.
alter table public.products add column if not exists drug_id text references public.drugs(id) on delete set null;
create index if not exists idx_products_drug_id on public.products(drug_id);

-- ─── Enable RLS on all new tables ─────────────────────────────
alter table public.suppliers enable row level security;
alter table public.drug_categories enable row level security;
alter table public.drug_forms enable row level security;
alter table public.drugs enable row level security;
alter table public.drug_batches enable row level security;
alter table public.drug_stock_movements enable row level security;

-- ─── Drop existing policies for re-runs ───────────────────────
drop policy if exists "suppliers_select_member" on public.suppliers;
drop policy if exists "suppliers_write_admin_plus" on public.suppliers;
drop policy if exists "drug_categories_select_member" on public.drug_categories;
drop policy if exists "drug_categories_write_admin_plus" on public.drug_categories;
drop policy if exists "drug_forms_select_member" on public.drug_forms;
drop policy if exists "drug_forms_write_admin_plus" on public.drug_forms;
drop policy if exists "drugs_select_member" on public.drugs;
drop policy if exists "drugs_write_admin_plus" on public.drugs;
drop policy if exists "drug_batches_select_member" on public.drug_batches;
drop policy if exists "drug_batches_write_admin_plus" on public.drug_batches;
drop policy if exists "drug_stock_movements_select_member" on public.drug_stock_movements;
drop policy if exists "drug_stock_movements_insert_member" on public.drug_stock_movements;

-- ─── RLS Policies ─────────────────────────────────────────────
-- Uses auth.uid()::text because auth_user_id is TEXT (per migration 4)
-- Pattern matches existing tables:
--   - workspace-scoped (pharmacy_id must match user's active membership)
--   - write access for owner/admin/manager/pharmacist roles
--   - read access for all active members
--   - Global reference data (pharmacy_id IS NULL) is readable by all members

-- Suppliers
create policy "suppliers_select_member" on public.suppliers
  for select using (
    (pharmacy_id is null)
    or exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = suppliers.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "suppliers_write_admin_plus" on public.suppliers
  for all using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = suppliers.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager')
    )
  ) with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = suppliers.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager')
    )
  );

-- Drug Categories (global reference data + pharmacy-specific)
create policy "drug_categories_select_member" on public.drug_categories
  for select using (
    (pharmacy_id is null)
    or exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_categories.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "drug_categories_write_admin_plus" on public.drug_categories
  for all using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_categories.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  ) with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_categories.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

-- Drug Forms (global reference data + pharmacy-specific)
create policy "drug_forms_select_member" on public.drug_forms
  for select using (
    (pharmacy_id is null)
    or exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_forms.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "drug_forms_write_admin_plus" on public.drug_forms
  for all using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_forms.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  ) with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_forms.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

-- Drugs
create policy "drugs_select_member" on public.drugs
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drugs.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "drugs_write_admin_plus" on public.drugs
  for all using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drugs.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  ) with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drugs.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

-- Drug Batches
create policy "drug_batches_select_member" on public.drug_batches
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_batches.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "drug_batches_write_admin_plus" on public.drug_batches
  for all using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_batches.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  ) with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_batches.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist')
    )
  );

-- Drug Stock Movements (read for pharmacists+, insert for pharmacists+)
create policy "drug_stock_movements_select_member" on public.drug_stock_movements
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_stock_movements.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "drug_stock_movements_insert_member" on public.drug_stock_movements
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = drug_stock_movements.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager', 'pharmacist', 'cashier')
    )
  );

-- ─── Seed Data: Drug Categories ───────────────────────────────
-- Idempotent: uses INSERT ... ON CONFLICT (id) DO NOTHING
-- These are global reference categories (pharmacy_id IS NULL)
insert into public.drug_categories (id, name, description, status, pharmacy_id) values
  ('dc_antibiotics', 'Antibiotics', 'Drugs that kill or slow bacterial growth', 'active', null),
  ('dc_analgesics', 'Analgesics and Antipyretics', 'Pain relief and fever reduction medications', 'active', null),
  ('dc_antimalarials', 'Antimalarials', 'Drugs for malaria treatment and prevention', 'active', null),
  ('dc_antifungals', 'Antifungals', 'Drugs that treat fungal infections', 'active', null),
  ('dc_antivirals', 'Antivirals', 'Drugs that treat viral infections', 'active', null),
  ('dc_antihistamines', 'Antihistamines', 'Drugs that block histamine receptors for allergy relief', 'active', null),
  ('dc_antihypertensives', 'Antihypertensives', 'Drugs for high blood pressure management', 'active', null),
  ('dc_antidiabetics', 'Antidiabetics', 'Drugs for diabetes management', 'active', null),
  ('dc_gastrointestinal', 'Gastrointestinal Medicines', 'Drugs for digestive system disorders', 'active', null),
  ('dc_respiratory', 'Respiratory Medicines', 'Drugs for asthma, COPD, and breathing disorders', 'active', null),
  ('dc_vitamins', 'Vitamins and Supplements', 'Nutritional supplements and vitamin preparations', 'active', null),
  ('dc_dermatological', 'Dermatological Medicines', 'Topical treatments for skin conditions', 'active', null),
  ('dc_eye_ear', 'Eye and Ear Preparations', 'Ophthalmic and otic medications', 'active', null),
  ('dc_hormonal', 'Hormonal Medicines', 'Hormone replacement and endocrine therapies', 'active', null),
  ('dc_antiseptics', 'Antiseptics and Disinfectants', 'Topical antimicrobials and disinfectants', 'active', null),
  ('dc_cardiovascular', 'Cardiovascular Medicines', 'Drugs for heart and circulatory system', 'active', null),
  ('dc_emergency', 'Emergency Medicines', 'Life-saving medications for emergency use', 'active', null),
  ('dc_other', 'Other Medicines', 'Miscellaneous pharmaceutical products', 'active', null)
on conflict (id) do nothing;

-- ─── Seed Data: Drug Forms ────────────────────────────────────
insert into public.drug_forms (id, name, description, status, pharmacy_id) values
  ('df_tablet', 'Tablet', 'Oral solid dosage form containing active ingredient in compressed form', 'active', null),
  ('df_capsule', 'Capsule', 'Oral dosage form with gelatin shell filled with active ingredient', 'active', null),
  ('df_oral_suspension', 'Oral Suspension', 'Liquid dosage form with suspended particles for oral use', 'active', null),
  ('df_syrup', 'Syrup', 'Sweetened liquid dosage form for oral administration', 'active', null),
  ('df_injection', 'Injection', 'Sterile parenteral dosage form for injection', 'active', null),
  ('df_cream', 'Cream', 'Topical semi-solid dosage form for external application', 'active', null),
  ('df_ointment', 'Ointment', 'Topical semi-solid dosage form, oil-based, for external use', 'active', null),
  ('df_gel', 'Gel', 'Topical semi-solid dosage form, water-based, for external application', 'active', null),
  ('df_drops', 'Drops', 'Sterile liquid dosage form for ophthalmic, otic, or nasal use', 'active', null),
  ('df_eye_drops', 'Eye Drops', 'Sterile liquid dosage form for ophthalmic administration', 'active', null),
  ('df_ear_drops', 'Ear Drops', 'Sterile liquid dosage form for otic administration', 'active', null),
  ('df_inhaler', 'Inhaler', 'Device for delivering medication as a spray or powder to the lungs', 'active', null),
  ('df_powder', 'Powder', 'Dry powder dosage form for oral or other administration', 'active', null),
  ('df_sachet', 'Sachet', 'Small single-dose packet, typically for powder or liquid', 'active', null),
  ('df_suppository', 'Suppository', 'Dosage form for rectal administration', 'active', null),
  ('df_solution', 'Solution', 'Liquid dosage form with dissolved active ingredient', 'active', null),
  ('df_lotion', 'Lotion', 'Topical liquid preparation for external application', 'active', null),
  ('df_spray', 'Spray', 'Metered-dose delivery system for topical or mucosal administration', 'active', null)
on conflict (id) do nothing;

-- ─── Database Functions ───────────────────────────────────────

-- Function: receive_drug_batch
-- Transactionally receives a new batch of stock, creates an audit record,
-- and prevents negative quantities. Called server-side from the Worker.
create or replace function public.receive_drug_batch(
  p_pharmacy_id uuid,
  p_drug_id text,
  p_batch_number text,
  p_manufacturing_date date,
  p_expiry_date date,
  p_quantity_received integer,
  p_purchase_price numeric,
  p_selling_price numeric,
  p_supplier_id text default null,
  p_supplier_name text default null,
  p_user_name text default null
) returns text as $$
declare
  v_batch_id text;
  v_total_cost numeric;
  v_new_quantity integer;
begin
  if p_quantity_received <= 0 then
    raise exception 'quantity_received must be positive';
  end if;
  if p_expiry_date <= current_date then
    raise exception 'cannot receive batch with past or current expiry date';
  end if;

  v_total_cost := (p_purchase_price * p_quantity_received);

  insert into public.drug_batches (
    id, drug_id, batch_number, manufacturing_date, expiry_date,
    quantity_received, quantity_remaining, purchase_price, selling_price,
    total_cost, supplier_id, supplier_name, supplier_phone,
    received_date, status, pharmacy_id, created_at, updated_at, revision
  ) values (
    'db_' || uuid_generate_v4()::text,
    p_drug_id, p_batch_number, p_manufacturing_date, p_expiry_date,
    p_quantity_received, p_quantity_received, p_purchase_price, p_selling_price,
    v_total_cost, p_supplier_id, p_supplier_name, null,
    current_date,
    case when p_expiry_date < current_date + interval '30 days' then 'expired' else 'active' end,
    p_pharmacy_id
  ) returning id into v_batch_id;

  -- Audit log
  insert into public.drug_stock_movements (
    id, drug_id, batch_id, movement_type, quantity,
    quantity_before, quantity_after, unit_price, user_name, pharmacy_id
  ) values (
      'dsm_' || uuid_generate_v4()::text,
    p_drug_id, v_batch_id, 'receive', p_quantity_received,
    0, p_quantity_received, p_purchase_price, p_user_name, p_pharmacy_id
  );

  return v_batch_id;
end;
$$ language 'plpgsql' security definer;

-- Function: deduct_drug_stock
-- FEFO-compliant stock deduction. Issues from the batch(es) with
-- the earliest expiry first. Never allows negative stock.
-- Returns JSON with batch-level deduction details.
create or replace function public.deduct_drug_stock(
  p_pharmacy_id uuid,
  p_drug_id text,
  p_quantity_needed integer,
  p_sale_id text default null,
  p_user_name text default null
) returns jsonb as $$
declare
  v_remaining integer := p_quantity_needed;
  v_results jsonb := '{"deductions": [], "total_deducted": 0, "success": false, "error": null}';
  v_batch_id text;
  v_batch_qty integer;
  v_deducted integer;
  v_before integer;
  v_after integer;
begin
  if p_quantity_needed <= 0 then
    v_results := jsonb_set(v_results, '{error}', '"quantity_needed must be positive"');
    return v_results;
  end if;

  -- Get batches ordered by expiry_date ASC (FEFO), excluding expired batches
  for v_batch_id, v_batch_qty in
    select id, quantity_remaining
    from public.drug_batches
    where pharmacy_id = p_pharmacy_id
      and drug_id = p_drug_id
      and quantity_remaining > 0
      and status in ('active', 'dispensed')
      and deleted_at is null
      and (expiry_date > current_date or expiry_date is null)
    order by expiry_date asc, received_date asc
    for update
  loop
    if v_remaining <= 0 then
      exit;
    end if;

    v_deducted := least(v_remaining, v_batch_qty);
    v_before := v_batch_qty;
    v_after := v_batch_qty - v_deducted;

    update public.drug_batches
      set quantity_remaining = v_after,
          revision = revision + 1,
          updated_at = now()
      where id = v_batch_id;

    -- Audit log
    insert into public.drug_stock_movements (
      id, drug_id, batch_id, movement_type, quantity,
      quantity_before, quantity_after, reference_id, reference_type,
      user_name, pharmacy_id
    ) values (
    'dsm_' || uuid_generate_v4()::text,
      p_drug_id, v_batch_id, 'sell', -v_deducted,
      v_before, v_after, p_sale_id, 'sale', p_user_name, p_pharmacy_id
    );

    v_results := jsonb_set(
      v_results, '{deductions}',
      v_results->'deductions' || jsonb_build_object(
        'batch_id', v_batch_id,
        'quantity_deducted', v_deducted,
        'expiry_date', (select expiry_date from public.drug_batches where id = v_batch_id)
      )
    );

    v_remaining := v_remaining - v_deducted;
    v_results := jsonb_set(v_results, '{total_deducted}', (v_results->>'total_deducted')::int + v_deducted);
  end loop;

  if v_remaining > 0 then
    v_results := jsonb_set(v_results, '{error}', '"insufficient stock: tried to deduct ' || p_quantity_needed || ' but only ' || (p_quantity_needed - v_remaining) || ' available"');
  else
    v_results := jsonb_set(v_results, '{success}', 'true');
  end if;

  return v_results;
end;
$$ language 'plpgsql' security definer;

-- Function: get_drug_stock_summary
-- Returns current on-hand quantity, aggregated across all active batches.
create or replace function public.get_drug_stock_summary(p_pharmacy_id uuid, p_drug_id text)
returns table (
  drug_id text,
  total_quantity integer,
  total_batches integer,
  total_purchase_value numeric,
  total_current_value numeric,
  is_expired boolean,
  nearest_expiry_date date
) as $$
begin
  return query
  select
    p_drug_id as drug_id,
    coalesce(sum(db.quantity_remaining), 0) as total_quantity,
    count(db.id) as total_batches,
    coalesce(sum(db.total_cost), 0) as total_purchase_value,
    coalesce(sum(db.quantity_remaining * db.selling_price), 0) as total_current_value,
    bool_or(db.expiry_date < current_date) as is_expired,
    min(db.expiry_date) as nearest_expiry_date
  from public.drug_batches db
  where db.pharmacy_id = p_pharmacy_id
    and db.drug_id = p_drug_id
    and db.deleted_at is null;
end;
$$ language 'plpgsql' stable;

-- Function: identify_expired_batches
-- Returns list of expired batches for a pharmacy.
-- Called periodically to flag expiry status.
create or replace function public.identify_expired_batches(p_pharmacy_id uuid)
returns table (
  batch_id text,
  drug_id text,
  batch_number text,
  expiry_date date,
  quantity_remaining integer,
  supplier_name text
) as $$
begin
  return query
  select
    db.id as batch_id,
    db.drug_id as drug_id,
    db.batch_number as batch_number,
    db.expiry_date as expiry_date,
    db.quantity_remaining as quantity_remaining,
    db.supplier_name as supplier_name
  from public.drug_batches db
  where db.pharmacy_id = p_pharmacy_id
    and db.expiry_date < current_date
    and db.deleted_at is null;
end;
$$ language 'plpgsql' stable;
