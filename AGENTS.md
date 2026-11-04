# AGENTS.md — Dawa Smart Development Guide

## Project Overview
Dawa Smart is an offline-first pharmacy management system built as a vanilla HTML/JS single-page application with Supabase PostgreSQL backend and Cloudflare Worker API layer.

## Project Structure
```
dawa-smart/
├── app.html                    # Main SPA (single-file, ~5300 lines)
├── reporting.js                 # Reporting engine (financial analysis, PDF, archiving)
├── sync-queue.js                # Offline-first sync queue
├── supabase2.js                # Supabase client wrapper
├── license.js                  # License/trial management
├── tenant2.js                  # Multi-tenant workspace management
├── worker.js                   # Cloudflare Worker API layer
├── sw2.js                      # Service worker
├── _headers                    # Cloudflare Pages security headers
├── _redirects                  # Cloudflare Pages routing
├── wrangler.toml               # Cloudflare deployment config
├── dist/                       # Build output (mirrors root files)
└── supabase/
    └── migrations/             # Database schema migrations
        ├── 20240101000000_init_schema.sql
        ├── 20240101000001_create_pharmacies_and_memberships.sql
        ├── 20240101000002_add_pharmacy_id_to_tables.sql
        ├── 20240101000003_create_drug_management_tables.sql
        └── 20240101000004_create_report_archives.sql
```

## Database Schema
- **Primary keys**: Text-based (`product_`, `sale_`, `cat_`, `dc_`, `df_`, `drug_`, `batch_`, `sm_`, `sup_` prefixes)
- **Multi-tenancy**: JWT carries `pharmacy_id`; Worker injects into all queries
- **Soft deletes**: All tables have `deleted_at` column
- **Revisions**: `revision` column for optimistic concurrency
- **RLS**: Policies use `auth.uid()::text` pattern matching `pharmacy_id`

## Key Conventions
- All database writes go through `db.add/update/getById` which enqueue sync operations
- `getCurrentPharmacyId()` retrieves tenant from JWT
- `isDemo()` / `isEditor()` for role-based UI gating
- `showToast(message, type, duration)` for user notifications
- Timezone: Africa/Nairobi for all date filtering
- `PROTECTED_COLUMNS` in worker: `pharmacy_id`, `created_at`, `updated_at`, `deleted_at`, `revision`
- `backup()` saves all data to file; `restore()` loads from file with license protection
- Reports: Period selector controls date range; `generateReport()` fetches from IDB/supabase; `saveReportArchive()` persists snapshot

## Deployment
```bash
# Deploy
wrangler pages deploy dist/ --branch=main --no-bundle --commit-dirty=true --skip-caching

# Migrate database:
# 1. Apply supabase/migrations/* in order via Supabase SQL Editor
# 2. Verify worker.js ALLOWED_ENTITIES and ROLE_PERMISSIONS are current
```

## Testing
- App is a SPA — open `dist/app.html` in browser
- Demo mode: auto-fills sample data (1200+ drugs, users, sales)
- Check console for sync/IndexedDB errors
- Verify FEFO stock deduction: sell multiple products, check batch depletion order
