-- Store pharmacy-specific receipt branding and logos with the tenant.
alter table public.pharmacies
  add column if not exists branding jsonb not null default '{}'::jsonb;
