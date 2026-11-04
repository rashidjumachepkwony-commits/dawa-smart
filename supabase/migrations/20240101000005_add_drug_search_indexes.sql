-- =============================================================
-- Dawa Smart — Phase 4: Smart Drug Search Support
-- =============================================================
-- Adds indexes to support efficient smart search and cascading
-- dropdown queries on the drugs table.
--
-- These indexes enable:
--   - Fast lookups by generic_name (for dropdown 1)
--   - Fast lookups by strength (for dropdown 2)
--   - Fast lookups by form_id + strength (for dropdown 3)
--   - Fast lookups by brand_name (for dropdown 4)
--   - Composite search across name, generic, brand, strength
-- =============================================================

-- Index on generic_name for dropdown 1 (Generic Drug Name)
create index if not exists idx_drugs_generic_name_trgm
  on public.drugs using gin (gin_trgm_ops(generic_name))
  where deleted_at is null;

-- Index on strength for dropdown 2 (Available Strength)
create index if not exists idx_drugs_strength_trgm
  on public.drugs using gin (gin_trgm_ops(strength))
  where deleted_at is null and strength is not null;

-- Index on form_id + strength for dropdown 3 (Dosage Form)
create index if not exists idx_drugs_form_strength
  on public.drugs(form_id, strength)
  where deleted_at is null;

-- Index on brand_name for dropdown 4 (Brand)
create index if not exists idx_drugs_brand_trgm
  on public.drugs using gin (gin_trgm_ops(brand_name))
  where deleted_at is null and brand_name is not null;

-- Composite index for full-text-like searching across multiple fields
create index if not exists idx_drugs_search_composite
  on public.drugs(generic_name, brand_name, strength, form_id, drug_name)
  where deleted_at is null;

-- Index to support unique constraint on (pharmacy_id, generic_name, brand_name, strength, form_id)
create unique index if not exists idx_drugs_unique_variation
  on public.drugs(pharmacy_id, lower(generic_name), lower(brand_name), lower(strength), form_id)
  where deleted_at is null;
