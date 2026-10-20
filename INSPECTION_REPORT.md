# Dawa Smart — Secure Multi-User Data Isolation Inspection Report
**Date:** 2026-10-20  
**Branch:** `feature/cloudflare-supabase-offline`  
**Scope:** INSPECTION ONLY — no changes made

---

## 1. Frontend Framework, Entry Files, Routing & Auth

| Item | Finding |
|------|---------|
| **Framework** | Pure vanilla HTML/CSS/JS — single-file SPA (`app.html`, 3,267 lines) |
| **Entry point** | `app.html` — everything bundled in one file, no build system |
| **Routing** | Client-side tab navigation via `data-page` attributes (POS, inventory, pricing, expenses, analysis, credits, patients, lab, users, drugdb, reports, settings) |
| **Script includes** | `license.js`, `supabase-client.js`, `sync-queue.js` loaded as separate files (lines 853-856) |

### Login/Registration Implementation (`app.html:1327-1568`)

**Current auth system:** Hardcoded credentials in JavaScript source (`app.html:1327`):
```js
const SINGLE_USER = { id: 'user_rashidjuma', ..., password: 'RASHID2026', role: 'developer', ... };
const DEMO_USER = { id: 'user_demo', ..., password: 'DEMO2026', role: 'demo', ... };
```

- **Passwords stored in plaintext** in frontend source code
- No registration endpoint — users defined as constants in source
- Additional users can be added via the "Users" management screen (admin-only), stored in `localStorage` (`yetu_users` key) and IndexedDB
- `findUser()` (line 1349) performs a simple array lookup — no server-side validation

---

## 2. Supabase Tables & Feature Usage

| Table | Purpose | App Features That Read/Write |
|-------|---------|------------------------------|
| `users` | System users (mirrors `yetu_users`) | User management (`loadUsers`, `saveUser`, `deleteUser`), auth (`SINGLE_USER`, `DEMO_USER` constants) |
| `products` | Inventory items | POS product grid, inventory management (`loadProducts`, `saveProduct`, `editProduct`, `deleteProduct`, `quickAddProduct`) |
| `batches` | Batch/expiry tracking | Product batches (`saveBatch`, `addProductBatch`) |
| `sales` | Sales transactions | Checkout, receipt generation, sales history (`checkout`, `editSale`, `updateSale`, `deleteSale`, `generateInvoice`) |
| `sale_items` | Line items for sales | Checkout items, sale editing |
| `patients` | Patient/customer records (EMR) | Patient management, credit ledger (`loadPatients`, `savePatient`, `editPatient`, `deletePatient`, `loadLedger`, `exportLedger`) |
| `lab_tests` | Lab test records | Lab management (`loadLabTests`, `saveLabTest`, `editLabTest`, `deleteLabTest`) |
| `expenses` | Business expenses | Expense tracking (`saveExpense`, `loadExpensesForDate`, `deleteExpense`) |
| `controlled_logs` | Controlled drug access logs | Controlled drug logging (`logControlledAccess` via localStorage at line 2027) |

### Sync Queue Mapping (`sync-queue.js:13-24`)
Entities synced to Supabase via `/api/sync`:
`products`, `sales`, `saleItems`, `patients`, `batches`, `controlledLogs`, `labTests`, `expenses`, `users`

---

## 3. Supabase Auth & User Identity

### Finding: Supabase Auth is NOT Used for Primary Auth

- The app uses its own hardcoded credential system (see Section 1)
- Supabase Auth integration (`supabase-client.js:124-164`) is a **fallback bridge** — it only activates if the Supabase JS client is initialized
- `supabaseSignIn()` (line 124) attempts to map usernames to Supabase Auth via `username@dawasmartz.local`, with fallback to the Worker's `/api/auth/local` endpoint
- **User IDs are NOT stable UUIDs**: The `users` table uses `uuid_generate_v4()` for new records, but existing users have string IDs (`user_rashidjuma`, `user_demo`). No migration mapping exists between local user IDs and Supabase UUIDs.

### No Registration Flow
- No `signUp` or registration function exists anywhere in the codebase
- Only two users exist: hard-coded `SINGLE_USER` (developer) and `DEMO_USER` (demo role)

---

## 4. Cloudflare Worker API Routes

| Route | Method | Auth Required | Authorization |
|-------|--------|---------------|---------------|
| `/api/health` | GET | No | N/A — public health check |
| `/api/config` | GET | No | N/A — returns anon key only |
| `/api/auth/local` | POST | No | No auth — accepts username/password, returns JWT |
| `/api/sync` | POST | **Yes** — JWT verified | **No per-record authorization** — uses service_role key |

### Critical: `/api/sync` Authorization Gap (`worker.js:140-198`)

The `/api/sync` endpoint:
1. **Verifies the JWT** (line 145) — checks token validity and expiration
2. **Does NOT check per-record ownership** — the Worker uses the `SUPABASE_SERVICE_ROLE` key (bypasses all RLS)
3. Any authenticated user can insert/update/delete ANY record in ANY table

The JWT payload only contains `sub`, `username`, `role`, `fullName`, `email` — there is no per-operation authorization check against which records the user owns.

---

## 5. Owner/Tenant Fields

### Finding: No `user_id` or tenant identifier on any table

**All 9 Supabase tables lack a `user_id`, `owner_id`, or `tenant_id` column.** Verification:

```
grep for user_id|workspace|tenant|tenant_id → No matches found in the codebase
```

- The `users` table is the only table with identity (it stores users themselves)
- `sales.cashier` (line 129) is a text field storing the cashier's full name, not a user reference
- `patients` has no linking to users
- All other data entities are implicitly "global" — any authenticated user can read all records

---

## 6. Row Level Security Status

### Verified Settings (from `supabase/migrations/20240101000000_init_schema.sql`)

**RLS is enabled on ALL 9 tables** (lines 258-266):
```sql
alter table public.users enable row level security;
alter table public.products enable row level security;
-- ... (batches, sales, sale_items, patients, lab_tests, expenses, controlled_logs)
```

### Policies (lines 268-447)

| Table | Policy Logic |
|-------|-------------|
| `users` | Select own or admin/developer; insert/update admin-only |
| `products` | All authenticated users can read; admin/manager/pharmacist can write |
| `batches` | All authenticated users can read; admin/manager/pharmacist can write |
| `sales` | All authenticated users can read + insert; admin/manager/pharmacist can update |
| `sale_items` | Select: joins sales table to verify; Insert: checks cashier name matches |
| `patients` | All authenticated users can read + write |
| `lab_tests` | All authenticated users can read + write |
| `expenses` | All authenticated users can read; admin/manager can write |
| `controlled_logs` | All authenticated users can read; admin/pharmacist can write |

### Cannot Inspect Locally (Requires Live Supabase Project)

- [ ] **Policies actually applied** — schema file exists but not confirmed deployed to live project
- [ ] **RLS enforcement active** — dependent on project deployment
- [ ] **JWT claims mapping** — the policies reference `auth.uid()` but the Worker issues custom HS256 JWTs, not Supabase-native JWTs. This is a **critical incompatibility risk**:

> The RLS policies use `auth.uid()` which expects Supabase JWT format. The Worker issues custom HS256 tokens with `sub` field only. Supabase will NOT recognize these as valid user tokens unless the JWT is configured to work with Supabase's `gotrue` claims structure.

---

## 7. Secret Exposure Check

### Findings: VERIFIED — No frontend secret exposure

- The `service_role` key and `JWT_SECRET` are **only referenced inside `worker.js`** via `env.SUPABASE_SERVICE_ROLE` and `env.JWT_SECRET` (Worker secrets, set via `wrangler secret put`)
- No `.env` file exists in the repo (only `.env.example` with placeholders)
- A grep for `SUPABASE_SERVICE_ROLE` across tracked files found **zero matches** in `app.html`, `sw.js`, `sync-queue.js`, `supabase-client.js`, or any HTML/JS file
- Secrets are only in `worker.js` (Worker runtime only) and `.env.example` (placeholders)
- The `/api/config` endpoint (line 58-71) returns only `supabaseAnonKey` — never the service role key

**Status: SECURE** — no secret exposure in frontend code.

---

## 8. Cross-User Data Leaks

### Risk Assessment: CRITICAL

| Operation | Risk | Detail |
|-----------|------|--------|
| **LIST all records** | ⚠ HIGH | Every user sees ALL products, patients, sales, lab tests, expenses — no filtering by user |
| **Search records** | ⚠ HIGH | Global search across all records (e.g., `loadProducts`, `loadPatients` fetch all) |
| **Create records** | ⚠ HIGH | Any authenticated user can create records for any entity |
| **Update records** | ⚠ HIGH | Worker uses service_role key (bypasses RLS); no ownership check |
| **Delete records** | ⚠ HIGH | Same — no ownership verification on Worker |
| **File upload/download** | N/A | No file upload feature exists |
| **Pull changes** | ⚠ HIGH | `pullChanges()` (`sync-queue.js:290-367`) pulls ALL records for ALL entities — no user filtering |

### Key Vulnerabilities:

1. **RLS is role-based, NOT user-based** — policies check `role` (admin/pharmacist/etc.) but NOT which user the record belongs to
2. **No `user_id` column on any table** to establish ownership
3. **Worker `/api/sync` bypasses RLS entirely** — uses service_role key with no record-level filtering
4. **Frontend fetches ALL records** — `loadProducts()`, `loadPatients()`, etc. load everything into memory for every user
5. **The JWT `sub` field is the only user identifier** but it's never used for record ownership in any context

---

## 9. Demo vs Shared Data

### Finding: Shared writable data across all users

- **DEMO** and **RASHID** share the **same database** (IndexedDB `YetuPharmcareDB`) on the same browser/device
- Both users log into the **same physical database** — the app does not isolate data per user even locally
- The license system (`license.js`) tracks trial state per-browser (via `localStorage`), not per-user
- There is **no per-user data partitioning** in either local storage or Supabase
- Sample data is loaded into the shared DB — there is no separate "demo schema/tenant"

**Risk:** A DEMO user logging into a browser that previously had RASHID's data would see all of RASHID's patients, sales, and inventory.

---

## 10. Recommended Phased Implementation Plan

### Phase 1: Foundation (Minimal Risk)

1. **Add `user_id` column to all tables** (except `users`) via a new migration
   ```sql
   ALTER TABLE public.products ADD COLUMN user_id uuid;
   ALTER TABLE public.sales ADD COLUMN user_id uuid;
   -- etc. for all 8 tables
   ```
   - **Non-breaking**: existing records get `user_id = NULL`
   - Backward compatible — app continues working

2. **Update Worker `/api/sync`** to inject `user_id` from JWT `sub` into payload
   - Modify `processSyncOperation()` to add `user_id: payload.sub` before insert/update
   - Do NOT block on missing `user_id` during transition

3. **Update sync-queue.js** to pass `currentUser.id` as part of payload
   - Modify `enqueueOperation()` callers to include `{userId: currentUser.id}`

### Phase 2: Enforce Ownership in Worker

4. **Add ownership filter to Worker sync endpoint** (not in `/api/sync` itself, but in record processing)
   - For `update` and `delete` operations, verify the record belongs to the requesting user (via service_role query before PATCH)
   - For `create` operations, inject `user_id`

5. **Update RLS policies to scope by `user_id`**
   - Add `and user_id = auth.uid()` to all SELECT policies
   - Add `and user_id = auth.uid()` to UPDATE/DELETE policies
   - Admin/developer roles keep wildcard access

### Phase 3: Frontend Isolation

6. **Update data loading functions** to filter by `currentUser.id`
   - `loadProducts()` → add `.eq('user_id', currentUser.id)` (when Supabase active)
   - `loadPatients()` → same
   - For IndexedDB (offline), scope queries by `userId` index
   - This requires adding `userId` to all record objects on save

7. **Update sample data** to tag with the current user's ID
   - `loadSampleData()` should set `userId: currentUser.id` on all seeded records

### Phase 4: Multi-Tenant Support

8. **Add `workspace_id` column** (optional future step)
   - Enables team sharing — users in the same workspace can see each other's data
   - Admin sets `workspace_id` for each user during onboarding

9. **Migrate `users` table** to use consistent UUIDs
   - Current string IDs (`user_rashidjuma`, `user_demo`) need mapping to UUIDs
   - Or change existing records to UUID type

### Phase 5: Auth Modernization

10. **Move to Supabase Auth** (long-term)
    - Replace hardcoded `SINGLE_USER`/`DEMO_USER` constants with proper auth
    - Use Supabase Edge Functions for credential provisioning
    - Deprecate `/api/auth/local` token exchange

### Non-Breaking Guarantees

- All existing user data preserved (no deletes/migrations that destroy data)
- App continues local-only mode if Supabase is unconfigured
- DEMO restrictions and trial logic remain unchanged
- RASHID's full access preserved

---

## File Locations Referenced

| File | Lines | Content |
|------|-------|---------|
| `app.html` | 1327-1331 | Hardcoded user credentials |
| `app.html` | 1349 | `findUser()` auth lookup |
| `app.html` | 1525-1568 | `handleLogin()` function |
| `app.html` | 1191-1213 | `db` IndexedDB wrapper |
| `app.html` | 3105-3134 | Sync indicator UI |
| `app.html` | 3235-3249 | `updateOfflineBadge()` + listeners |
| `worker.js` | 140-198 | `/api/sync` endpoint |
| `worker.js` | 220-233 | `LOCAL_USERS` constant |
| `worker.js` | 288-345 | `processSyncOperation()` |
| `sync-queue.js` | 58-76 | `enqueueOperation()` |
| `sync-queue.js` | 290-367 | `pullChanges()` |
| `supabase-client.js` | 124-164 | `supabaseSignIn()` |
| `superbase/migrations/*_init_schema.sql` | 41-266 | Schema + RLS policies |
| `license.js` | 99-116 | `activateDemoTrial()` |
