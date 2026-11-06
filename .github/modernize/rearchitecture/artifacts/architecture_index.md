# Architecture Index

## Scope and Evidence

This is a read-only architecture snapshot of the repository as inspected. No target framework, migration, or rewrite scope was requested. The root tree and checked-in `dist/` tree are not identical in runtime file availability: the app references `license2.js` and `/sw2.js`, which are found only under `dist/`.

## Implementation Guide

**This index is not the full contract. Do not implement from this file alone; follow the artifact paths below.** These artifacts document observed behavior; they do not authorize a rewrite or alter production schema.

### Global artifacts

- `unit_graph.yaml`
  - Who reads: all work units.
  - Use for: runtime unit boundaries, entry points, dependencies, and dynamic service-worker loading.
  - How to consume: locate the assigned unit and use only its `source_anchors` and dependency rows.
- `wire_contracts.yaml`
  - Who reads: workers touching APIs, Supabase, or Daraja.
  - Use for: current HTTP methods, paths, payload summaries, auth, and error behavior.
  - How to consume: filter `contracts` by `unit`; retain exact existing paths and methods unless a change is explicitly approved.
- `shared_modules.yaml`
  - Who reads: all workers.
  - Use for: cross-unit source modules. It is empty because no shared source module was identified in this unit decomposition.
- `cross_unit_state.yaml`
  - Who reads: SPA, Worker, and PWA workers.
  - Use for: JWT/pharmacy context and Service Worker/client-message state.
  - How to consume: filter `flows` where `writer.unit` or `reader.unit` matches the assigned unit; validate the runtime hint.
- `project-structure.md`, `tech-stack.md`, `data-model.md`
  - Who reads: all architecture/design and implementation work.
  - Use for: overall layers, concrete stack, persisted entities, relationships, and repository/deployment caveats. They describe the current system only.

### Unit: `marketing-site`

- External trigger: static page at `/` (`index.html`).
- Must read: `units/marketing-site/behavior.yaml`, `units/marketing-site/bindings.yaml`, and `units/marketing-site/unit_decomposition.yaml`.
- Relevant global rows: `wire_contracts.yaml` has no marketing-site rows; `cross_unit_state.yaml` has no marketing-site flows.
- Before DONE report: artifacts read, preserved navigation/links, unresolved contracts, and relevant browser evidence.

### Unit: `pharmacy-spa`

- External trigger: application page at `/app` or `app.html`.
- Must read: `units/pharmacy-spa/behavior.yaml`, `units/pharmacy-spa/bindings.yaml`, and `units/pharmacy-spa/unit_decomposition.yaml`.
- Relevant global rows: `wire_contracts.yaml` rows for SPA-to-Worker/Supabase calls; `cross_unit_state.yaml` rows touching `pharmacy-spa`; `unit_graph.yaml` Worker/PWA dependencies.
- Before DONE report: artifacts read, preserved user-visible branches and storage/sync side effects, unresolved contracts, and build/runtime evidence. Verify which `dist/` files actually ship.

### Unit: `worker-api`

- External trigger: HTTP requests under `/api/*`.
- Must read: `units/worker-api/behavior.yaml`, `units/worker-api/bindings.yaml`, and `units/worker-api/unit_decomposition.yaml`.
- Relevant global rows: `wire_contracts.yaml` rows where `unit: worker-api`; `cross_unit_state.yaml` rows touching `worker-api`; no shared-module rows.
- Before DONE report: artifacts read, preserved route/request/response/auth behavior, unresolved external contracts, and endpoint/build/runtime evidence.

### Unit: `offline-pwa-worker`

- External trigger: Service Worker lifecycle/fetch/sync/message events in `dist/sw2.js`.
- Must read: `units/offline-pwa-worker/behavior.yaml`, `units/offline-pwa-worker/bindings.yaml`, and `units/offline-pwa-worker/unit_decomposition.yaml`.
- Relevant global rows: `cross_unit_state.yaml` flows touching `offline-pwa-worker`; `unit_graph.yaml` SPA dependency.
- Before DONE report: artifacts read, preserved cache/network and message behavior, unresolved browser-support assumptions, and offline/runtime evidence.

## Snapshot Limitations

- The Supabase live database, deployed Pages asset set, Worker secrets, and Daraja configuration were not queried.
- No build or test command was run; the repository has no root package manifest.
- Duplicate migration version prefixes and a drop/re-add auth-ID migration are documented in `data-model.md`; confirm the real database state before applying migrations.
