-- =============================================================
-- Dawa Smart — Phase 5: M-Pesa STK Push Integration
-- =============================================================
-- Creates M-Pesa configuration and transaction tables for
-- multi-tenant STK Push integration with Safaricom Daraja API.
--
-- Each pharmacy (tenant) has its own M-Pesa configuration
-- and transaction records, isolated by pharmacy_id.
-- =============================================================

-- ─── M-Pesa Configuration (per pharmacy) ───────────────────────
create table if not exists public.mpesa_configs (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade not null,
  
  -- M-Pesa Account Configuration
  paybill_number text,
  till_number text,
  account_type text check (account_type in ('PAYBILL', 'BUY_GOODS')) not null,
  business_shortcode text not null,  -- The shortcode used for transactions
  
  -- Daraja API Credentials (encrypted at rest by application layer)
  consumer_key text not null,
  consumer_secret text not null,      -- Encrypted by application
  passkey text not null,              -- Encrypted by application
  
  -- Environment Configuration
  environment text check (environment in ('SANDBOX', 'PRODUCTION')) not null default 'SANDBOX',
  
  -- Callback Configuration
  callback_url text,                  -- Full callback URL for Safaricom
  result_url text,                    -- For STK Push result
  timeout_url text,                   -- For STK Push timeout
  
  -- Payment Settings
  is_enabled boolean default false,
  min_amount numeric default 1,
  max_amount numeric default 70000,   -- Safaricom STK Push limit
  
  -- Metadata
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One M-Pesa config per pharmacy
create unique index if not exists idx_mpesa_configs_pharmacy
  on public.mpesa_configs(pharmacy_id);

-- ─── M-Pesa Transactions (per pharmacy) ────────────────────────
create table if not exists public.mpesa_transactions (
  id uuid primary key default uuid_generate_v4(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade not null,
  sale_id text references public.sales(id) on delete set null,
  
  -- Customer Information
  phone_number text not null,         -- Customer's M-Pesa phone number
  amount numeric not null,            -- Transaction amount
  
  -- Safaricom Request/Response IDs
  merchant_request_id text,           -- From STK Push request
  checkout_request_id text,           -- From STK Push request (for polling)
  mpesa_receipt_number text,          -- Safaricom receipt number (on success)
  
  -- Transaction Status
  result_code text,                   -- Safaricom result code (0 = success)
  result_description text,            -- Safaricom result description
  payment_status text check (
    payment_status in ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT')
  ) not null default 'PENDING',
  
  -- Transaction Details
  transaction_date timestamptz,       -- When transaction completed
  transaction_metadata jsonb,         -- Full callback payload for audit
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_mpesa_transactions_pharmacy
  on public.mpesa_transactions(pharmacy_id);
create index if not exists idx_mpesa_transactions_sale
  on public.mpesa_transactions(sale_id);
create index if not exists idx_mpesa_transactions_checkout_request
  on public.mpesa_transactions(checkout_request_id);
create index if not exists idx_mpesa_transactions_status
  on public.mpesa_transactions(payment_status);
create index if not exists idx_mpesa_transactions_date
  on public.mpesa_transactions(transaction_date desc);

-- ─── Triggers ──────────────────────────────────────────────────
drop trigger if exists update_mpesa_configs_updated_at on public.mpesa_configs;
create trigger update_mpesa_configs_updated_at
  before update on public.mpesa_configs
  for each row execute function update_updated_at();

drop trigger if exists update_mpesa_transactions_updated_at on public.mpesa_transactions;
create trigger update_mpesa_transactions_updated_at
  before update on public.mpesa_transactions
  for each row execute function update_updated_at();

-- ─── Enable RLS ────────────────────────────────────────────────
alter table public.mpesa_configs enable row level security;
alter table public.mpesa_transactions enable row level security;

-- ─── RLS Policies ──────────────────────────────────────────────
-- Drop existing policies for re-runs
drop policy if exists "mpesa_configs_select_member" on public.mpesa_configs;
drop policy if exists "mpesa_configs_insert_owner_admin" on public.mpesa_configs;
drop policy if exists "mpesa_configs_update_owner_admin" on public.mpesa_configs;
drop policy if exists "mpesa_transactions_select_member" on public.mpesa_transactions;
drop policy if exists "mpesa_transactions_insert_member" on public.mpesa_transactions;
drop policy if exists "mpesa_transactions_update_owner_admin" on public.mpesa_transactions;

-- M-Pesa Configs - Pharmacy members can READ their pharmacy's config
create policy "mpesa_configs_select_member" on public.mpesa_configs
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = mpesa_configs.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Only owners/admins can INSERT M-Pesa config
create policy "mpesa_configs_insert_owner_admin" on public.mpesa_configs
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = mpesa_configs.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  );

-- Only owners/admins can UPDATE M-Pesa config
create policy "mpesa_configs_update_owner_admin" on public.mpesa_configs
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = mpesa_configs.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = mpesa_configs.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  );

-- M-Pesa Transactions - Pharmacy members can READ their pharmacy's transactions
create policy "mpesa_transactions_select_member" on public.mpesa_transactions
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = mpesa_transactions.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Members can INSERT transactions (initiated by cashiers)
create policy "mpesa_transactions_insert_member" on public.mpesa_transactions
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = mpesa_transactions.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Only owners/admins can UPDATE transactions (for status updates from callbacks)
create policy "mpesa_transactions_update_owner_admin" on public.mpesa_transactions
  for update using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = mpesa_transactions.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = mpesa_transactions.pharmacy_id
      and pm.role in ('owner', 'admin')
      and pm.status = 'active'
    )
  );

-- ─── Helper View: M-Pesa Config with Pharmacy Name ─────────────
create or replace view public.v_mpesa_configs as
select
  mc.*,
  p.name as pharmacy_name,
  p.slug as pharmacy_slug
from public.mpesa_configs mc
join public.pharmacies p on p.id = mc.pharmacy_id;

-- ─── Helper View: M-Pesa Transactions with Sale Info ───────────
create or replace view public.v_mpesa_transactions as
select
  mt.*,
  s.receipt_number,
  s.customer as sale_customer,
  s.total as sale_total,
  s.method as sale_method
from public.mpesa_transactions mt
left join public.sales s on s.id = mt.sale_id;
