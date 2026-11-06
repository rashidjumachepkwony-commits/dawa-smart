# Existing Technology Stack

## Languages and Runtime

- Browser application: HTML5, CSS, and vanilla JavaScript; no TypeScript, bundler, or frontend framework is declared.
- API: JavaScript ES module for the Cloudflare Workers runtime, using web-standard `fetch`, `Request`, `Response`, Web Crypto, and Worker environment bindings.
- Database: PostgreSQL managed by Supabase; the repository contains SQL migrations and PL/pgSQL functions.
- Browser persistence: IndexedDB (`YetuPharmcareDB`, schema version 5 in `app.html`) and localStorage.
- No package manifest or lockfile was found at the repository root, and no compiler/runtime engine versions are declared for the browser code.

## Frameworks and External Libraries

| Technology | Version/evidence | Usage |
|---|---|---|
| Cloudflare Workers | `wrangler.toml`, compatibility date `2024-01-01`; no Wrangler package version pinned in this repository | Worker API runtime |
| Cloudflare Pages | `_headers`, `_redirects`, `dist/` deployment structure | Static application hosting and `/api/*` proxy |
| Supabase JavaScript client | Loaded dynamically from `@supabase/supabase-js@2`; fallback URLs include `2.49.0` and `2.39.0` | Optional browser client and REST/auth integration |
| Supabase PostgreSQL/PostgREST | Project URL configured in `wrangler.toml`; migrations use PostgreSQL features | Persistent storage, REST interface, RLS |
| Font Awesome | CDN version `6.5.0` | Icons |
| Google Fonts | DM Sans and Plus Jakarta Sans, requested weights in HTML | Typography |
| Safaricom Daraja | OAuth and STK Push endpoints in `worker.js`; sandbox/production selected from tenant configuration | M-Pesa payments |

The browser Supabase URL and SDK version are partly runtime-configured. The Worker reads secrets and configuration from environment bindings (`SUPABASE_URL`, `SUPABASE_ANON_KEY`/`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE`, and `JWT_SECRET`). The repository does not establish whether those secrets are currently provisioned in the deployed Worker.

The Worker persists the M-Pesa `consumer_secret` and `passkey` received in the configuration request directly in its Supabase record payload; no encryption step was found in the handler, although the migration comments describe those values as application-encrypted.

## Configuration and Packaging

- `wrangler.toml`: Worker name, entry point, account identifier, compatibility date, `workers_dev`, and non-secret variables.
- `_redirects`: Pages SPA routes and `/api/*` proxy to the Worker.
- `_headers`: response headers and cache directives.
- `manifest.json`: installable-app metadata, icons, and shortcuts.
- `dist/`: checked-in deployment file set, including files absent from the root such as `license2.js` and `sw2.js`.
- `.env.example`: environment-variable template; it is not a build manifest.

There is no defined build, lint, type-check, or package-install pipeline in the root. The JavaScript has no declared engine floor; browser APIs used include IndexedDB, Service Workers, Background Sync where supported, Web Crypto, and `AbortSignal.timeout` where available.

## Alternate and Unreferenced Implementations

The root includes parallel legacy-named files (`license.js`, `tenant.js`, `sync-queue.js`, `supabase-client.js`, and `sw.js`) alongside newer `*2.js` modules. `app.html` loads the `*2.js` variants and registers `sw2.js`. `reporting.js` is present but is not included by the current `app.html` script tags. The deployment copies also contain versioned variants such as `license.v5.js`, `supabase-client.v5.js`, and `sw.v5.js`; their runtime use is not established by the current SPA entry point.

## Database Technology and Notable Mechanics

The migration set uses `uuid-ossp`, `pg_trgm`, UUID and text identifiers, JSONB, partial/composite indexes, RLS policies, timestamp triggers, and PL/pgSQL routines for drug stock operations. Worker API writes use Supabase's REST interface and the service-role environment binding. The migration files define RLS, but this repository analysis does not verify the live database's applied schema or policy state.
