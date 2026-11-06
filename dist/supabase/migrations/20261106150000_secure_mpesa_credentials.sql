-- Keep M-Pesa credentials behind the Worker and prevent duplicate STK
-- requests from one pharmacy/client request key.

alter table public.mpesa_transactions
  add column if not exists client_request_id text;

create unique index if not exists idx_mpesa_transactions_pharmacy_request
  on public.mpesa_transactions(pharmacy_id, client_request_id)
  where client_request_id is not null;

-- The Worker accesses these tables with service_role. Direct client access to
-- mpesa_configs would expose stored credentials, even when the UI masks them.
drop policy if exists "mpesa_configs_select_member" on public.mpesa_configs;
drop policy if exists "mpesa_configs_insert_owner_admin" on public.mpesa_configs;
drop policy if exists "mpesa_configs_update_owner_admin" on public.mpesa_configs;
drop policy if exists "mpesa_transactions_select_member" on public.mpesa_transactions;
drop policy if exists "mpesa_transactions_insert_member" on public.mpesa_transactions;
drop policy if exists "mpesa_transactions_update_owner_admin" on public.mpesa_transactions;

-- These legacy views use the view owner's privileges and expose mc.*. RLS on
-- the underlying tables does not protect them, so M-Pesa reads now go through
-- the pharmacy-scoped Worker endpoints only.
drop view if exists public.v_mpesa_configs;
drop view if exists public.v_mpesa_transactions;
revoke all on table public.mpesa_configs, public.mpesa_transactions from anon, authenticated;

comment on column public.mpesa_configs.consumer_key is
  'AES-GCM encrypted by the Cloudflare Worker; never expose through client queries';
comment on column public.mpesa_configs.consumer_secret is
  'AES-GCM encrypted by the Cloudflare Worker; never expose through client queries';
comment on column public.mpesa_configs.passkey is
  'AES-GCM encrypted by the Cloudflare Worker; never expose through client queries';
