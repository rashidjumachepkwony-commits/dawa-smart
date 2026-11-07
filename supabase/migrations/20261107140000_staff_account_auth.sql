-- Persist administrator-managed staff accounts within their pharmacy.
alter table public.users
  add column if not exists pharmacy_id uuid references public.pharmacies(id) on delete cascade;

create index if not exists idx_users_pharmacy_id
  on public.users(pharmacy_id);
