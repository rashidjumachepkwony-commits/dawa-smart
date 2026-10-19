# Dawa Smart — Cloud Migration Guide

This guide explains how to deploy Dawa Smart on Cloudflare with Supabase integration for offline-first cloud sync.

## Prerequisites

- [ ] A Cloudflare account (for Pages + Workers + DNS)
- [ ] A Supabase account (for PostgreSQL + Auth)
- [ ] The domain `startechafrica.co.ke` (nameservers managed in Cloudflare)
- [ ] Node.js 18+ installed locally
- [ ] Git installed locally

---

## 1. Supabase Setup

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter project name: `dawa-smart`
4. Set a strong database password
5. Select region closest to Kenya (e.g., `eu-central-1`)
6. Click "Create Project"

### Step 2: Run Database Migrations
The schema migration is in `supabase/migrations/20240101000000_init_schema.sql`.

**Option A — Via Supabase Dashboard:**
1. Open your project → Schema → SQL Editor
2. Paste the migration content and click "Run"

**Option B — Via Supabase CLI:**
```bash
npm install -g supabase
supabase init
supabase db push
```

### Step 3: Get Your API Keys
From your Supabase project settings → API:
- **URL**: Copy `SUPABASE_URL`
- **anon/public key**: Copy `SUPABASE_ANON_KEY`
- **service_role key**: Copy `SUPABASE_SERVICE_ROLE_KEY` (this is secret!)

### Step 4: Configure Row Level Security
The migration SQL includes all RLS policies. Verify they're active:
1. Supabase Dashboard → Table Editor → Each table
2. Ensure "RLS" toggle is enabled for all tables

---

## 2. Cloudflare Worker Setup

### Step 1: Install Wrangler
```bash
npm install -g wrangler
```

### Step 2: Authenticate
```bash
wrangler login
```

### Step 3: Set Worker Secrets
```bash
# Required secrets:
wrangler secret put SUPABASE_URL
# Paste your Supabase project URL (e.g., https://xyz.supabase.co)

wrangler secret put SUPABASE_ANON_KEY
# Paste your Supabase anon key (safe to expose)

wrangler secret put SUPABASE_SERVICE_ROLE
# Paste your Supabase service_role key (SECRET — never in frontend)

wrangler secret put JWT_SECRET
# Generate a strong random secret, e.g.:
# openssl rand -hex 32
```

### Step 4: Deploy the Worker
```bash
npx wrangler deploy
```

The Worker will be available at: `https://dawa-smart-api.YOUR_ACCOUNT.workers.dev`

For a custom domain (recommended), see [Step 6](#6-connect-startechaoskdecke).

---

## 3. Cloudflare Pages Setup

### Step 1: Connect Repository
1. Go to Cloudflare Dashboard → Pages
2. Click "Create a Page"
3. Connect your Git repository (GitHub/GitLab/etc.)
4. Select the branch: `feature/cloudflare-supabase-offline`
5. Build settings:
   - Build command: *(leave empty — no build step)*
   - Build output directory: *(leave empty)*
   - Framework: `None`

### Step 2: Configure Environment Variables
In Pages → Settings → Environment Variables, add:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Deploy
Click "Save and Deploy"

---

## 4. Configure the App for Sync (Optional)

Sync is **opt-in**. The app works fully offline without any configuration.
To enable cloud sync:

1. Log in as **RASHID** / `RASHID2026` (developer account)
2. In the app's Settings → license/dev panel:
   - Enter your Supabase URL and anon key
   - These are stored in `localStorage` under `dawa_supabase_config`
3. The sync layer (`sync-queue.js`) auto-detects the configuration
4. New/updated records are queued and synced when online

**Note:** In production, you would configure this via:
- A hidden admin panel that fetches config from `/api/config`
- Or environment variables served by the Worker

---

## 5. How Sync Works

### Write Path (offline → online)
1. User creates/edits/deletes a record in the app
2. IndexedDB stores the change immediately
3. `sync-queue.js` enqueues the operation in `localStorage`
4. When online, the queue is sent to the Cloudflare Worker at `/api/sync`
5. The Worker applies changes to Supabase using the `service_role` key
6. On success, the operation is removed from the local queue

### Read Path (online → local)
1. On app start and every 5 minutes (when online):
2. App fetches recent changes from `/api/sync/pull?since=<timestamp>`
3. Local IndexedDB records are merged with server data
4. Conflicts are detected via `revision` field + `updated_at` timestamps

### Conflict Resolution
- Each record has a `revision` integer that increments on each update
- The Worker checks revision before applying updates
- If `payload.revision !== server.revision`, a conflict is detected
- Conflicting operations are marked as `failed` in the queue
- The user is notified to refresh and resolve manually

### Offline Data Safety
- All writes are persisted to IndexedDB **before** showing success
- The sync queue is persisted in `localStorage` and survives page reloads
- License/trial data (`dawasmartz_*` keys) is **never** part of the sync queue
- Cache cleanup never deletes IndexedDB data

---

## 6. Connect startechafrica.co.ke

### Step 1: Transfer Nameservers (if not already done)
1. Log in to your domain registrar
2. Change nameservers to Cloudflare's:
   - `lola.ns.cloudflare.com`
   - `dilbert.ns.cloudflare.com`
3. Wait for propagation (may take up to 24 hours)

### Step 2: Add Domain in Cloudflare
1. Cloudflare Dashboard → Workers & Pages → Add route
2. Enter your Worker → "Custom domains" → "Add custom domain"
3. Enter: `api.startechafrica.co.ke`
4. Cloudflare will generate a CNAME record

### Step 3: Configure DNS Records
In Cloudflare Dashboard → DNS:

| Type | Name | Content | Proxy status |
|------|------|---------|-------------|
| `CNAME` | `www` | `dawa-smart.r2.cloudflarestatic.com` or your Pages deployment URL | Proxied |
| `A` | `@` | Point to your origin (or use Pages default) | Proxied |
| `CNAME` | `api` | `dawa-smart-api.YOUR_ACCOUNT.workers.dev` | Proxied |

### Step 4: Verify SSL/TLS
1. Cloudflare Dashboard → SSL/TLS → Overview
2. Set mode to "Full" (or "Full (strict)" with origin cert)
3. Edge Certificates are automatic

### Step 5: Test
```bash
curl https://api.startechafrica.co.ke/api/health
curl https://startechafrica.co.ke
curl https://startechafrica.co.ke/app.html
```

---

## 7. Testing Checklist

### Offline Tests
- [ ] App loads after initial visit (no internet)
- [ ] New products can be added while offline
- [ ] Sale transactions persist while offline
- [ ] Page refresh preserves pending changes
- [ ] Browser restart preserves pending changes
- [ ] Offline badge appears when connection lost
- [ ] Sync badge shows pending count when offline

### Online Tests
- [ ] Existing app functionality still works (POS, inventory, reports)
- [ ] Connection status updates (online/offline)
- [ ] Sync queue drains when connection returns
- [ ] No duplicate records after sync
- [ ] Conflict detection works
- [ ] License/trial data not synced or cleared

### Security Tests
- [ ] No Supabase service_role key in frontend code
- [ ] No credentials in Git history
- [ ] Worker JWT verification works
- [ ] Unauthorized API requests rejected

### Deployment Tests
- [ ] Landing page loads at `startechafrica.co.ke`
- [ ] App loads at `startechafrica.co.ke/app.html`
- [ ] `/api/health` returns OK
- [ ] `/api/config` returns anonymous key only
- [ ] PWA install prompt appears
- [ ] Service worker registers successfully

---

## 8. Rollback Instructions

### Roll back to the pre-cloud state
```bash
# Switch back to the landing page branch
git checkout feature/dawa-smart-landing-page

# Restore the app without sync/service worker changes
git checkout feature/dawa-smart-landing-page -- app.html manifest.json
```

### Disable cloud sync without rolling back
1. Remove Supabase config from localStorage:
   - Developer tools → Application → Local Storage → Remove `dawa_supabase_config`
2. The app automatically reverts to local-only IndexedDB mode

### Stop the Cloudflare Worker
```bash
# In Cloudflare Dashboard → Workers → dawa-smart-api → "Delete"
# Or via wrangler:
npx wrangler delete dawa-smart-api
```

### Remove domain configuration
1. Cloudflare Dashboard → DNS → Delete API and CNAME records
2. Cloudflare Dashboard → Workers & Pages → Remove custom domain

---

## 9. Known Limitations

1. **No automatic migration**: Users must manually configure Supabase credentials
2. **Service worker scope**: SW only controls `/app.html` and its dependencies — the landing page at `index.html` is served statically
3. **Template literals in app.html**: The inline JavaScript uses template literals extensively, which makes automated testing harder
4. **No automated tests for UI**: Tests in `tests/test-offline-sync.js` require browser context for full coverage
5. **Demo credentials are in source**: RASHID/RASHID2026 and DEMO/DEMO2026 are in `app.html` (client-side auth limitation)
6. **The `Yetu Pharmcare/` subdirectory** is a legacy standalone copy and is NOT synced

---

## 10. File Inventory

| File | Type | Purpose |
|------|------|---------|
| `app.html` | Modified | Main app + SW registration + sync UI |
| `index.html` | New | Landing page |
| `landing.css` | New | Landing page styles |
| `license.js` | Existing | License & trial manager |
| `license.css` | Existing | License UI |
| `manifest.json` | Modified | PWA manifest (start_url → app.html) |
| `sw.js` | New | Service worker (app shell caching) |
| `sync-queue.js` | New | Offline-first sync queue |
| `supabase-client.js` | New | Supabase integration (optional) |
| `worker.js` | New | Cloudflare Worker (API gateway) |
| `wrangler.toml` | New | Worker deployment config |
| `_headers` | New | Cloudflare Pages security headers |
| `_redirects` | New | Cloudflare Pages routing |
| `.env.example` | New | Configuration template |
| `supabase/migrations/*_init_schema.sql` | New | Database schema + RLS |
| `tests/test-offline-sync.js` | New | Offline/sync test suite |
| `assets/` | Existing | Icons and dashboard preview |
| `Yetu Pharmcare/index.html` | Untouched | Legacy standalone copy |
