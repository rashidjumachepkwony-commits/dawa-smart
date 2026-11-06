# Project Structure

## Classification

Dawa Smart is a full-stack, offline-first pharmacy-management web application. Its browser interface is a vanilla HTML/CSS/JavaScript single-page application and installable PWA. Cloudflare Pages serves static assets, a Cloudflare Worker provides the `/api/*` layer, and Supabase PostgreSQL stores synchronized records.

## Runtime and Layers

| Layer | Main files | Responsibility |
|---|---|---|
| Public website | `index.html`, `landing.css` | Static marketing page and link to the application |
| Application UI and browser domain logic | `app.html` | Login, navigation, POS, inventory, patient, lab, reporting, settings, and other feature screens; much of the UI and logic is inline |
| Browser persistence | IndexedDB code in `app.html`; localStorage in the app modules | Local records, auth/tenant state, license data, and the durable sync queue |
| Browser integration modules | `tenant2.js`, `sync-queue2.js`, `supabase2.js`, `dist/license2.js` | Tenant/auth state, offline synchronization, optional Supabase client, and trial/license state |
| Edge API | `worker.js` | Authentication, workspace membership, record synchronization, admin reads, and M-Pesa integration |
| Persistent data | `supabase/migrations/*.sql` | PostgreSQL tables, indexes, triggers, row-level policies, and database functions |
| PWA lifecycle | `dist/sw2.js` | Application-shell caching, network/cache routing, and background-sync messaging |
| Static hosting/deployment | `wrangler.toml`, `_headers`, `_redirects`, `manifest.json`, `dist/` | Worker configuration, Pages routing/headers, PWA metadata, and the deployable file set |

There is no conventional controller/service/repository package hierarchy. The SPA groups features as tabbed screens within a single HTML document; API dispatch and its handlers are grouped in one Worker module. Database access is split between IndexedDB in the SPA and Supabase/PostgREST calls in the browser modules and Worker.

## Entry Points and Navigation

- `index.html` is the static marketing entry point. Its “Open App” links target `app.html`.
- `app.html` is the pharmacy SPA entry point. `_redirects` maps `/` and application paths to `/app`; the in-app navigation selects screens using `data-page` buttons.
- `worker.js` is the Cloudflare Worker entry point (`export default.fetch`) and dispatches `/api/*`.
- `dist/sw2.js` is the service-worker entry point referenced by `app.html`. It handles install, activate, fetch, sync, and message events.

The SPA's visible navigation includes POS, inventory, pricing, expenses, analysis, credits, patients/EMR, lab, users, drug database, reports, settings, and an admin screen that is hidden by default. These screens are sections of `app.html`, not independently bundled pages.

## Functional Areas

- Sales/POS, checkout, receipts, and payment methods
- Product inventory, pricing, batches, expiry, and drug catalogue
- Patients/customers, credit balances, and ledger
- Laboratory orders and results
- Expenses, analysis, and report generation/archive
- User and pharmacy/workspace management
- Offline data entry, durable synchronization, and PWA shell
- License/trial state and settings/backup/restore
- Worker authentication, membership/invitation, admin, synchronization, and M-Pesa endpoints

## Repository Footprint

The root scan excluding `.git`, `dist`, `backups`, and `.wrangler` found 73 files: 38 JavaScript, 8 SQL, 3 HTML, 7 Markdown, and the remaining styles/assets/configuration files. These are repository file counts, not runtime-module counts. There is no npm/pnpm/yarn/bun manifest or lockfile. `dist/` contains deployment copies, assets, migrations, and tests; `backups/` contains older snapshots; `Yetu Pharmcare/` contains an additional standalone HTML file.

`reporting.js` is a separate reporting engine in the repository, but the current `app.html` script tags do not load it. Treat it as a separately present module unless another runtime loader is established.

## Source and Deployment Boundary

`app.html`, `worker.js`, `tenant2.js`, `sync-queue2.js`, `supabase2.js`, `reporting.js`, `sw.js`, and `index.html` were byte-identical to their `dist/` counterparts when compared during this analysis. The root has no `license2.js` or `sw2.js`; those files exist only under `dist/`, while `app.html` references `/license2.js` and registers `/sw2.js`. Thus the checked-in deployment directory supplies runtime files absent from the source root, and opening/deploying the root alone is not equivalent to serving `dist/`.

The root migration directory contains two pairs of files sharing the same 14-digit migration version prefix: `20240101000003_*` and `20240101000005_*`. The database state cannot be inferred solely from these repository files; the applied Supabase migration history was not queried.

## Cross-Layer Observations

- The SPA enqueues IndexedDB store names such as `saleItems`, `labTests`, `controlledLogs`, and `users`; the Worker allowlist uses SQL-style names such as `sale_items`, `lab_tests`, and `controlled_logs` and does not include `users`. No name-mapping step was found in the sync path. This is a concrete boundary mismatch for affected queued writes.
- `dist/sw2.js` sends `SYNC_REQUEST` to clients after a Background Sync event. No corresponding application message listener was found in `app.html` or `sync-queue2.js`; the queue also has ordinary online-triggered draining, but this message path is not paired in the inspected source.
