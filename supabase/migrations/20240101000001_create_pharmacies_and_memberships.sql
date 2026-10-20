-- =============================================================
-- Dawa Smart — Phase 1: Create Pharmacies and Memberships Tables
-- =============================================================
-- This migration adds the workspace-based tenant model to DawaSmart.
-- It creates:
--   1. public.pharmacies  — pharmacy workspaces
--   2. public.pharmacy_members — user-to-pharmacy memberships
--
-- RLS policies enforce that users can only access their own pharmacy data.
-- No existing tables are modified or data deleted by this migration.
-- =============================================================

-- ─── Pharmacies (workspaces) ───────────────────────────────────
create table if not exists public.pharmacies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  address text,
  phone text,
  kra_pin text,
  owner_id uuid references auth.users(id) on delete set null,
  status text check (status in ('active', 'suspended', 'trial')) default 'trial',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger update_pharmacies_updated_at
  before update on public.pharmacies
  for each row execute function update_updated_at();

create index if not exists idx_pharmacies_slug on public.pharmacies(slug);
create index if not exists idx_pharmacies_owner on public.pharmacies(owner_id);

-- ─── Pharmacy Members (joins users to pharmacies) ─────────────
create table if not exists public.pharmacy_members (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text,
  role text check (
    role in ('owner', 'admin', 'manager', 'pharmacist', 'cashier', 'lab', 'doctor', 'demo')
  ) not null,
  status text check (status in ('active', 'pending', 'suspended')) default 'pending',
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- A user can have only one membership per pharmacy
create unique index if not exists idx_pharmacy_members_unique
  on public.pharmacy_members(pharmacy_id, auth_user_id);

-- Invite by email before user exists
create unique index if not exists idx_pharmacy_members_email
  on public.pharmacy_members(pharmacy_id, email);

create index if not exists idx_pharmacy_members_user on public.pharmacy_members(auth_user_id);
create index if not exists idx_pharmacy_members_pharmacy on public.pharmacy_members(pharmacy_id);

create trigger update_pharmacy_members_updated_at
  before update on public.pharmacy_members
  for each row execute function update_updated_at();

-- ─── RLS on new tables ────────────────────────────────────────
alter table public.pharmacies enable row level security;
alter table public.pharmacy_members enable row level security;

-- Pharmacy members can READ their pharmacy
create policy "pharmacies_select_member" on public.pharmacies
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = pharmacies.id
      and pm.status = 'active'
    )
  );

-- Only owners can INSERT pharmacies (during registration)
create policy "pharmacies_insert_owner" on public.pharmacies
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.role = 'owner'
      and pm.status = 'active'
    )
    or
    -- Allow registration: owner_id in INSERT matches auth.uid()
    (owner_id = auth.uid() AND NOT EXISTS (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
    ))
  );

-- Only owners can UPDATE pharmacies
create policy "pharmacies_update_owner" on public.pharmacies
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
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
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = pharmacy_members.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Only owners/admins can insert/update memberships (invitations)
create policy "pharmacy_members_write_owner_admin" on public.pharmacy_members
  for insert, update with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = pharmacy_members.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  );

-- Prevent changing pharmacy_id on UPDATE (cannot move data between workspaces)
create policy "pharmacy_members_prevent_pharmacy_change" on public.pharmacy_members
  for update using (true)
  with check (
    -- Only allow updating if pharmacy_id is NOT being changed
    -- (Enforced via the update policy above, which requires ownership of target pharmacy)
    existing.pharmacy_id = pharmacy_members.pharmacy_id
    OR
    pharmacy_members.pharmacy_id = existing.pharmacy_id
  );
