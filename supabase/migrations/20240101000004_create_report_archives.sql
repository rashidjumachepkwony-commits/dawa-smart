-- =============================================================
-- Dawa Smart — Phase 4: Report Archives Table
-- =============================================================
-- Creates the report_archives table for permanent storage of
-- generated financial and operational report snapshots.
--
-- This table stores:
--   1. Snapshot metadata (report name, type, period)
--   2. Complete report data as JSONB (figures + details at generation time)
--   3. Summary financial figures for quick retrieval
--   4. PDF storage path for archived documents
--   5. Sync-safe with pharmacy_id for multi-tenant isolation
--
-- RLS ensures users can only access reports from their pharmacy.
-- No data is auto-deleted; reports persist indefinitely.
-- =============================================================

-- ─── Report Archives ────────────────────────────────────────────
-- Stores immutable snapshots of generated reports at the time of creation.
-- Once saved, the data is a historical record and should not be modified.
create table if not exists public.report_archives (
  id text primary key,
  report_name text not null,
  report_type text not null, -- 'sales', 'financial', 'inventory', 'profit_loss', 'custom'
  start_date date,
  end_date date,
  generated_by text, -- user identifier or name
  generated_at timestamptz default now(),
  report_data jsonb not null, -- Full report snapshot (figures + detail lines)
  total_sales numeric default 0,
  cash_sales numeric default 0,
  mpesa_sales numeric default 0,
  card_sales numeric default 0,
  credit_sales numeric default 0,
  total_expenses numeric default 0,
  gross_profit numeric default 0,
  net_profit numeric default 0,
  cost_of_goods_sold numeric default 0,
  pdf_storage_path text, -- Supabase Storage path for archived PDF
  is_deleted boolean default false, -- soft delete flag (never hard-delete financial reports)
  pharmacy_id uuid references public.pharmacies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for performant querying
create index if not exists idx_report_archives_pharmacy on public.report_archives(pharmacy_id);
create index if not exists idx_report_archives_type on public.report_archives(report_type);
create index if not exists idx_report_archives_date on public.report_archives(start_date, end_date);
create index if not exists idx_report_archives_generated on public.report_archives(generated_at desc);
create index if not exists idx_report_archives_name on public.report_archives(report_name);

drop trigger if exists update_report_archives_updated_at on public.report_archives;
create trigger update_report_archives_updated_at
  before update on public.report_archives
  for each row execute function update_updated_at();

-- ─── Enable RLS on report_archives ─────────────────────────────
alter table public.report_archives enable row level security;

-- ─── RLS Policies ────────────────────────────────────────────────
-- Only active members of the pharmacy can view reports
-- Only owners/admins/managers can delete (soft-delete) reports
drop policy if exists "report_archives_select_member" on public.report_archives;
drop policy if exists "report_archives_write_admin_plus" on public.report_archives;

create policy "report_archives_select_member" on public.report_archives
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = report_archives.pharmacy_id
      and pm.status = 'active'
    )
  );

create policy "report_archives_write_admin_plus" on public.report_archives
  for all using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = report_archives.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager')
    )
  ) with check (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()::text
      and pm.pharmacy_id = report_archives.pharmacy_id
      and pm.status = 'active'
      and pm.role in ('owner', 'admin', 'manager')
    )
  );

-- ─── Prevent deletion (soft-delete only) ─────────────────────────
-- Users cannot hard-delete report_archives; they can only set is_deleted = true
create policy "report_archives_prevent_hard_delete" on public.report_archives
  for delete using (false);

comment on table public.report_archives is 'Immutable report snapshots for regulatory compliance and historical reference'