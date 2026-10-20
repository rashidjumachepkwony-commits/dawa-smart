# Dawa Smart — Post-Deployment Verification Checklist

Use this checklist after deploying to `dawa.startechafrica.co.ke`.

## Cloudflare Pages Deployment
- [ ] Landing page loads at `https://dawa.startechafrica.co.ke`
- [ ] App opens at `https://dawa.startechafrica.co.ke/app.html`
- [ ] Login screen shows with DEMO credentials pre-filled
- [ ] Service worker registers (check in browser DevTools → Application → Service Workers)

## Cloudflare Worker
- [ ] Health check: `https://dawa-api.startechafrica.co.ke/api/health` returns `{"status":"ok"}`
- [ ] Config endpoint: `https://dawa-api.startechafrica.co.ke/api/config` returns public keys only
- [ ] Auth endpoint: `POST /api/auth/local` with RASHID/RASHID2026 returns JWT token
- [ ] Worker secrets are set (not visible in browser Network tab)

## Supabase
- [ ] Schema applied in SQL Editor (9 tables created)
- [ ] Row Level Security enabled on all tables
- [ ] Anonymous key NOT accessible from frontend (verify via Network tab)
- [ ] Service role key NOT in any committed file

## Offline-Online Flow
- [ ] App loads after initial visit without internet
- [ ] Offline badge appears when connection lost
- [ ] New product can be added while offline
- [ ] Sale transaction saves while offline
- [ ] Page refresh preserves pending operations
- [ ] Reconnecting triggers sync (check Network tab)
- [ ] No duplicate records after multiple syncs
- [ ] License/trial data unaffected by sync

## Security
- [ ] No secrets in frontend source code
- [ ] `.env` file NOT committed to Git
- [ ] `dawasmartz_license` key excluded from backup/restore
- [ ] SSL certificate active on all subdomains

## Files Modified

| File | Change |
|------|--------|
| `app.html` | Added SW registration, sync UI, connection listeners |
| `manifest.json` | Updated icon paths and start_url |
| `.gitignore` | Added dist/ and backups/ |
| `sw.js` | NEW — Service worker |
| `sync-queue.js` | NEW — Sync queue layer |
| `supabase-client.js` | NEW — Supabase integration |
| `worker.js` | NEW — Cloudflare Worker |
| `wrangler.toml` | NEW — Worker config |
| `_headers` | NEW — Security headers |
| `_redirects` | NEW — Routing |
| `.env.example` | NEW — Config template |
| `supabase/migrations/*_init_schema.sql` | NEW — DB schema |
| `tests/test-offline-sync.js` | NEW — Offline tests |
| `tests/test-database-crud.js` | NEW — DB CRUD tests |
| `MIGRATION.md` | NEW — Deployment guide |

## Rollback Instructions

1. **Revert to pre-cloud state:**
   ```bash
   git checkout feature/dawa-smart-landing-page
   git checkout feature/dawa-smart-landing-page -- app.html manifest.json
   ```

2. **Disable sync without rollback:**
   - Remove `dawa_supabase_config` from browser localStorage
   - App reverts to local-only IndexedDB mode automatically

3. **Stop Worker:**
   ```bash
   npx wrangler delete dawa-smart-api
   ```
