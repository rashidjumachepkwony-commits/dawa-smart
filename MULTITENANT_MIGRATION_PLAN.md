# Dawa Smart — Multi-Tenant Migration Plan

## Overview

This document describes the phased migration of DawaSmart from a single-instance pharmacy application to a secure **workspace-based (pharmacy-tenant) multi-tenant** system. Each pharmacy becomes an isolated workspace; staff must have explicit membership in a pharmacy to access its data.

---

## 0. Current State Summary

### Authentication
- **Hardcoded credentials** in `app.html:1327-1328`:
  - `SINGLE_USER` (RASHID / RASHID2026, role: developer)
  - `DEMO_USER` (DEMO / DEMO2026, role: demo)
- No Supabase Auth — credentials verified client-side via `findUser()` (line 1349)
- Passwords in **plaintext** in frontend JS
- No user registration endpoint

### Data Isolation
- **Zero isolation** — all data (IndexedDB + Supabase) is globally accessible to any authenticated user
- No `user_id` or `pharmacy_id` columns on any table
- Frontend loads ALL records globally (`loadProducts()`, `loadPatients()`, etc.)
- Worker `/api/sync` (line 140) uses `service_role` key with NO per-record ownership checks

### Schema
- 9 tables: `users`, `products`, `batches`, `sales`, `sale_items`, `patients`, `lab_tests`, `expenses`, `controlled_logs`
- All tables have: `id`, `created_at`, `updated_at`, `deleted_at` (tombstone), `revision`
- RLS enabled on all tables (verified in migration file)
- Policies are **role-based only** (admin/pharmacist/etc.) — NOT user-scoped or workspace-scoped

### Files to Change
| File | Changes |
|------|---------|
| `app.html` | Workspace selector, auth bridge, data scoping |
| `worker.js` | Secure auth, workspace resolution, per-record authorization |
| `supabase-client.js` | Workspace-aware client init |
| `sync-queue.js` | Add `pharmacyId` to queued operations |
| `sw.js` | Isolate cached API responses |
| `license.js` | Add workspace scoping to demo mode |
| New migration files | Schema changes for `pharmacies` and `pharmacy_members` |

---

## Phase 1: Workspace & Membership Model

### New Tables

#### `pharmacies` (workspace)
```sql
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  kra_pin TEXT,
  owner_id UUID,
  status TEXT CHECK (status IN ('active', 'suspended', 'trial')) DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `pharmacy_members` (membership)
```sql
CREATE TABLE IF NOT EXISTS public.pharmacy_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  auth_user_id UUID,
  email TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'pharmacist', 'cashier', 'lab', 'doctor', 'demo')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'pending', 'suspended')) DEFAULT 'pending',
  invited_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pharmacy_id, auth_user_id),
  UNIQUE (pharmacy_id, email)
);
```

### Roles (mapped to existing app roles)
| Role | Permissions |
|------|------------|
| **owner** | All actions + membership management + ownership transfer |
| **admin** | All actions except ownership transfer |
| **manager** | Inventory, sales, patients, expenses, lab |
| **pharmacist** | Inventory, sales, controlled drugs, batches |
| **cashier** | POS sales only |
| **lab** | Lab tests only |
| **doctor** | Limited read (patients, lab results) |
| **demo** | Read-only + trial isolation |

### Migration
Create `supabase/migrations/20240101000001_create_pharmacies_and_memberships.sql`.

---

## Phase 2: Add `pharmacy_id` to Business Tables

### Tables to Update
All business tables get an `pharmacy_id UUID REFERENCES pharmacies(id)` column:

| Table | Existing Columns | New Column |
|-------|------------------|------------|
| `products` | id, name, sku... | pharmacy_id → pharmacies(id) |
| `batches` | id, product_id... | pharmacy_id → pharmacies(id) |
| `sales` | id, customer... | pharmacy_id → pharmacies(id) |
| `sale_items` | id, sale_id... | pharmacy_id → pharmacies(id) |
| `patients` | id, first_name... | pharmacy_id → pharmacies(id) |
| `lab_tests` | id, patient_name... | pharmacy_id → pharmacies(id) |
| `expenses` | id, type... | pharmacy_id → pharmacies(id) |
| `controlled_logs` | id, product_id... | pharmacy_id → pharmacies(id) |

### Foreign Key Constraints
- `sale_items.pharmacy_id` must equal `sales.pharmacy_id` (validated server-side)
- `batches.pharmacy_id` must equal `products.pharmacy_id` (validated server-side)

### Migration
Create `supabase/migrations/20240101000002_add_pharmacy_id_to_tables.sql`.

---

## Phase 3: Secure Authentication & Registration

### New Flow (replacing hardcoded credentials)

1. **Registration endpoint** (`/api/auth/register` in Worker):
   - Accepts: email, password, full_name, pharmacy_name
   - Creates Supabase Auth user (email verified)
   - Creates pharmacy record with user as `owner`
   - Creates `pharmacy_members` record with role `owner`
   - Returns JWT + user + pharmacy context

2. **Login endpoint** (`/api/auth/login` in Worker):
   - Verifies via Supabase Auth `signInWithPassword`
   - Fetches user's pharmacy memberships from `pharmacy_members`
   - Returns JWT with `sub`, `email`, `role`, `pharmacy_id` claims
   - If user belongs to multiple pharmacies, returns list; client selects active workspace

3. **Legacy account migration**:
   - RASHID → Supabase Auth user, auto-linked to new pharmacy `Dawa Smart` as owner
   - DEMO → Supabase Auth user, auto-linked to isolated demo pharmacy
   - Passwords **removed from app.html**, stored only in hashed form in Supabase Auth

### Worker JWT Structure (replacing current custom JWT)
```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "role": "owner",
  "pharmacy_id": "pharmacy-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## Phase 4: Enforce Workspace Authorization in Worker

### Updated `/api/sync` (replacing worker.js:140-198)

Every operation must pass through:
```
1. Authenticate JWT (verify signature, expiry, issuer)
2. Resolve user identity from `sub` claim
3. Resolve `pharmacy_id` from JWT claim
4. Verify active membership in `pharmacy_members`
5. Check role permission for the entity operation
6. Inject `pharmacy_id` server-side (ignore client value)
7. For child records, verify parent `pharmacy_id` matches
8. Apply operation via `service_role` with `pharmacy_id` filter
```

### New Routes
| Route | Purpose |
|-------|---------|
| `/api/auth/register` | Register new user + create pharmacy |
| `/api/auth/login` | Login + return membership list |
| `/api/auth/memberships` | Get user's pharmacies |
| `/api/pharmacy/switch` | Switch active workspace |
| `/api/pharmacy/invite` | Invite staff to pharmacy |
| `/api/invitations/:id` | Accept/reject invitation |
| `/api/sync` | Batch sync (updated with workspace scoping) |

---

## Phase 5: Supabase RLS Policies

### New Policy Pattern (example for `products`)
```sql
-- Only users with active membership in the pharmacy can SELECT
create policy "products_select_member" on public.products
  for select using (
    exists (
      select 1 from public.pharmacy_members pm
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
    )
  );

-- Only admin/pharmacist/owner can INSERT
create policy "products_insert_member" on public.products
  for insert with check (
    exists (
      select 1 from public.pharmacy_members pm
      join public.pharmacies p on p.id = pm.pharmacy_id
      where pm.auth_user_id = auth.uid()
      and pm.pharmacy_id = products.pharmacy_id
      and pm.status = 'active'
      and pm.role IN ('owner', 'admin', 'manager', 'pharmacist')
    )
  );
```

### Critical Rule
- Every policy references `pharmacy_id` from the membership lookup
- `WITH CHECK` constraints prevent changing `pharmacy_id` on UPDATE
- `auth.uid()` uses Supabase Auth UUID, NOT the custom Worker JWT

---

## Phase 6: Frontend Data Isolation

### Changes to `app.html`

1. **Add `DawaTenant` module** (inline or new `tenant.js`):
   - `currentPharmacy` state with `id`, `name`, `slug`
   - `switchPharmacy()` function
   - `requirePharmacyContext()` guard

2. **Scope all `db.*` calls**:
   - Wrap IndexedDB queries with `pharmacyId` filter
   - Store `pharmacyId` on records before `db.add()` / `db.update()`
   - IndexedDB store key path updated to include tenant index

3. **Data loading functions scoped**:
   ```js
   // Before: db.getAll('products')
   // After: db.getAll('products').then(items => items.filter(i => i.pharmacyId === currentPharmacyId))
   ```

4. **Workspace switcher UI** in header (replacing pharmacy name span)

5. **Export/Import** scoped to active workspace only

6. **Stats, reports, search** all filtered by `pharmacyId`

---

## Phase 7: Offline Data Isolation

### IndexedDB Changes (`app.html:1191-1213`)
- Add `pharmacyId` index to each store
- Version bump: `YetuPharmcareDB` v4 → v5
- Migration script copies/isolates existing records

### Sync Queue Changes (`sync-queue.js`)
- Each queued operation includes `pharmacyId` in payload
- Server validates `pharmacyId` matches JWT claims (reject if mismatch)
- Pending operations are re-scoped if user's membership revoked

### Service Worker (`sw.js`)
- Do NOT cache authenticated API responses
- Cache only static assets + app shell

---

## Phase 8: Demo Isolation

### Approach: Dedicated Demo Pharmacy

1. **Seed a demo pharmacy** in Supabase (`pharmacy_id` = demo UUID)
2. **Demo users get** `pharmacy_id` = demo pharmacy in JWT
3. **Demo sample data** tagged with `pharmacy_id` = demo UUID
4. **Demo users CANNOT** switch to production pharmacies
5. **Local demo data** stored under a separate IndexedDB store name or prefixed keys
6. **License logic** (`license.js`) updated: trial tied to demo pharmacy membership

### No Shared Data
- Demo data is **completely isolated** in its own pharmacy workspace
- Two demo visitors get **different demo pharmacies** (or isolated session stores)

---

## Phase 9: Staff Management UI

### New screens in existing `app.html`:
- **Workspace dashboard** (new nav item) showing members, invitation form, role assignments
- **Invitation flow**: Owner/Admin enters email + role → Worker sends invitation → email contains link → user accepts → membership created
- **Workspace switcher**: Dropdown in header to switch between pharmacies user has access to

### Permission checks enforced server-side:
- Only owner/admin can invite/revoke
- Only owner can transfer ownership
- Cannot add self to another pharmacy

---

## Phase 10: Legacy Data Migration Strategy

### Steps (manual, documented, reversible):

1. **Create demo pharmacy** in Supabase
2. **Create production pharmacy** for RASHID named "Dawa Smart"
3. **Migrate RASHID's account**:
   - Create Supabase Auth user with existing email
   - Set password via admin panel or temporary reset
   - Create `pharmacy_members` record linking user to "Dawa Smart" as owner
4. **Migrate DEMO account** to demo pharmacy as demo role
5. **Assign `pharmacy_id`** to existing records:
   - Option A: Bulk update where `created_by = 'RASHID'` → "Dawa Smart"
   - Option B: Use a migration script that asks owner to confirm assignment
6. **Backup before migration**: `exportData()` already exists
7. **Rollback**: Restore backup → revert schema migration

### No Data Loss Guarantee
- Migration only **adds** `pharmacy_id` column (NULLABLE initially)
- Records remain accessible until migration assigns ownership
- Rollback = delete column + restore from backup

---

## Phase 11: Testing

### Test Files
| File | Purpose |
|------|---------|
| `tests/test-multitenant.js` | Workspace isolation tests |
| `tests/test-security.js` | Auth/authorization penetration tests |
| `tests/test-offline-sync.js` | Updated offline tests |
| `tests/test-database-crud.js` | Updated DB CRUD tests |

### Test Matrix (minimum 20 scenarios)
1. Pharmacy A owner creates product → visible to Pharmacy A only
2. Pharmacy B user cannot list Pharmacy A products
3. Forged `pharmacy_id` in sync rejected
4. Forged role in JWT rejected
5. Expired/revoked membership denied access
6. Demo user cannot access production data
7. Cross-tenant sale_item creation rejected
8. ... (13 more scenarios per task spec)

---

## Phase 12: Production Deployment Steps (NOT EXECUTED)

These steps are documented for a human operator to approve and execute:

1. Deploy new migration files to Supabase:
   ```bash
   supabase db push
   ```
2. Deploy updated Worker:
   ```bash
   npx wrangler deploy
   ```
3. Set Worker secrets:
   ```bash
   wrangler secret put SUPABASE_SERVICE_ROLE
   wrangler secret put JWT_SECRET
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_ANON_KEY
   ```
4. Configure Supabase Auth redirects in Cloudflare Pages
5. Configure Supabase Auth settings (email, redirect URLs)
6. Manually create pharmacy records for RASHID and DEMO
7. Manually assign existing records to pharmacies via SQL or Worker endpoint
8. Upload `app.html` and supporting files to Pages
9. Run security tests against staging
10. Monitor logs for auth failures

### Rollback (if issues):
1. Revert Worker to previous version: `wrangler rollback`
2. Revert frontend: redeploy previous commit
3. Drop `pharmacy_id` columns (or make NULL for rollback)
4. Restore previous RLS policies
