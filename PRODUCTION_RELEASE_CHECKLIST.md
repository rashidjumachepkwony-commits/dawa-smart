# Dawa Smart — Production Release Checklist

This checklist is tailored to the current Dawa Smart architecture: browser-first offline app (`app.html` + `sync-queue2.js`), Cloudflare Worker (`worker.js`), and Supabase/PostgreSQL schema migrations in `supabase/migrations/`.

Use this before shipping any production deployment or auth/schema migration.

## 1. Source-of-truth and deployment alignment
- [ ] Confirm the deployed runtime is the same code path intended for release.
- [ ] Verify whether the app is served from the repository root or from the generated `dist/` bundle.
- [ ] Ensure [dist/app.html](./dist/app.html), [dist/sw2.js](./dist/sw2.js), [dist/worker.js](./dist/worker.js), and their root counterparts are intentionally synchronized.
- [ ] Confirm the Pages deployment and Worker deployment reference the exact same build/version before DNS cutover.
- [ ] Verify the release commit contains no stale duplicate files such as old `v5` variants or backup copies that are accidentally served.

## 2. Environment and secrets validation
- [ ] `SUPABASE_URL` is set and points to the correct Supabase project.
- [ ] `SUPABASE_ANON_KEY` is set for the public app config and is NOT the service-role key.
- [ ] `SUPABASE_SERVICE_ROLE` is set in Cloudflare Worker secrets and is never exposed in the browser.
- [ ] `JWT_SECRET` is present and strong and matches the auth token verification logic used in [worker.js](./worker.js).
- [ ] All required environment variables for the Worker are loaded via `wrangler secret put` or equivalent secure secret management.
- [ ] No `.env` file or secret-bearing file is committed in the repo.

## 3. App runtime validation
- [ ] App loads successfully at the production domain.
- [ ] Login page loads and displays expected auth flow.
- [ ] `/api/config` responds without leaking service-role keys.
- [ ] `/api/health` responds with `200 OK` and the expected payload.
- [ ] Browser console is free of auth, sync, and service-worker initialization errors.
- [ ] Service worker registers successfully and background sync is available where supported.
- [ ] The app can run without internet access after first visit.
- [ ] Offline writes persist in local storage / IndexedDB until online sync resumes.
- [ ] Reconnection triggers sync queue drain and does not duplicate records.

## 4. Sync contract validation
- [ ] Sync queue uses canonical server naming (`sale_items`, `lab_tests`, `controlled_logs`).
- [ ] Legacy client payload names are normalized before sync dispatch.
- [ ] Worker-side normalization matches the same contract as the client.
- [ ] `SYNC_REQUEST` message flow is valid in the actual deployed service worker and client.
- [ ] Unknown or stale sync payload keys do not cause worker rejection.
- [ ] Pending queue items are retried and marked failed only after the documented retry budget is exhausted.
- [ ] A test case exists for offline add/update/delete operations and final reconciliation.

## 5. Auth and membership migration validation
- [ ] Confirm the live Supabase schema matches the assumptions in [supabase/migrations/20240101000003_fix_auth_user_id_type.sql](./supabase/migrations/20240101000003_fix_auth_user_id_type.sql).
- [ ] `public.pharmacy_members.auth_user_id` is `text` and not `uuid` in the live database.
- [ ] `public.pharmacies.owner_id` is `text` and not `uuid` in the live database.
- [ ] All RLS and worker queries that compare auth values use the correct type assumptions (`auth.uid()::text` where applicable).
- [ ] No policy still assumes `auth.uid()` is a UUID.
- [ ] No migration is run on a production database without a planned rollback path.
- [ ] Existing user IDs and membership rows are validated before migration, especially when values are not standard UUID strings.

## 6. Schema drift and migration safety
- [ ] Migration order in `supabase/migrations/` is validated before deployment.
- [ ] No migration is applied out of order.
- [ ] All policies that depend on `pharmacy_members.auth_user_id` are recreated after the type change.
- [ ] Indexes and constraints are checked after migration.
- [ ] `developer` role is present in the role check constraint if the app expects it.
- [ ] The migration is tested against a staging or copy of production data before final rollout.

## 7. Security and data protection checks
- [ ] Worker does not accept unauthenticated or malformed JWT tokens.
- [ ] Auth middleware enforces pharmacy membership before allowing access.
- [ ] User role permissions match the expected entity and operation policy matrix in [worker.js](./worker.js).
- [ ] No protected columns are exposed by public endpoints.
- [ ] No direct writes to tenant-scoped tables happen without pharmacy enforcement.
- [ ] Deleted or archived data is not reactivated by stale sync entries.
- [ ] License and trial markers remain protected from backup/restore and sync logic.

## 8. Final production launch gate
- [ ] Production environment variables and secrets verified.
- [ ] Supabase schema verification completed successfully.
- [ ] Worker health checks pass.
- [ ] Pages app loads successfully.
- [ ] Offline sync smoke test passes.
- [ ] Auth migration smoke test passes against the live schema.
- [ ] Rollback path confirmed.
- [ ] Deployment owner signs off before release.

## Recommended post-deploy smoke commands
```bash
curl https://api.startechafrica.co.ke/api/health
curl https://startechafrica.co.ke/app.html
curl -X POST https://api.startechafrica.co.ke/api/auth/local \
  -H 'Content-Type: application/json' \
  -d '{"username":"RASHID","password":"RASHID2026"}'
```

## Rollback plan
If production issues appear after release:
1. Stop the worker or route traffic away from the new release.
2. Revert the deployment to the last known-good app build.
3. Re-run the pre-deployment DB migration verification against the live database.
4. If the auth migration caused data-type issues, restore the database from a known-good snapshot and reapply the safe migration plan.
5. Recheck sync, auth, and role-scoped access before reopening traffic.
