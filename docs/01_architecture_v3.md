# 01 Architecture V3 - Control Document for Roo Code

## Purpose

This root-level document gives Roo Code a compact source of truth for Kavana V3 architecture without requiring it to infer details from scattered files. It summarizes the controls that must not be broken during automation.

## Permanent NotebookLM source

The permanent NotebookLM notebook for this project is:

```text
https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79
```

## Core architecture

Kavana V3 is a multi-tenant MES SaaS with:

- React/Vite frontend HMI.
- NestJS backend API.
- PostgreSQL 18 with shared-schema multi-tenancy.
- Row Level Security enforced on multi-tenant tables.
- Feature flags stored in JSONB.
- Offline-first operator HMI using IndexedDB/Dexie.js.
- Local AI orchestration through `tools-ai/`, outside production code.

## Feature flags JSON persistence

Tenant capabilities are governed by `feature_matrix` JSONB.

- Each module is independently toggleable.
- Frontend queries `GET /tenant/capabilities` and renders UI conditionally.
- Example: `oee_monitoring` module controls visibility of `unit_of_measure` and `target_rate` fields in Manufacturing Models.
- When OEE is disabled, those fields are completely hidden from the UI.

Key rules:

- Each module must live in an independent folder.
- Each module must be declared in `feature_matrix.modular_matrix`.
- Backend must validate module access with guards such as `@RequireFeature('module_key')`.
- Frontend must receive evaluated capabilities, not query flags directly.
- Changes to module flags must be audited.
- Unknown module keys must fail closed.

Main files:

- [`docs/technical/03_feature-flags-modularity.md`](technical/03_feature-flags-modularity.md:1)
- [`database/migrations/005_tenant_governance.sql`](../database/migrations/005_tenant_governance.sql:1)
- [`backend/src/tenant-capabilities/tenant-capabilities.service.ts`](../backend/src/tenant-capabilities/tenant-capabilities.service.ts:1)

## Frontend tab structure

The current frontend separates operator, supervisor and admin contexts with dual theme support:

- Operator HMI route: `/`
- Supervisor route: `/supervisor`
- Tenant admin route: `/admin`
- Operator UI: [`frontend/src/OperatorPanel.tsx`](../frontend/src/OperatorPanel.tsx:1) (moderno) + [`frontend/src/ClassicOperatorPanel.tsx`](../frontend/src/ClassicOperatorPanel.tsx:1) (clásico)
- Supervisor UI: [`frontend/src/SupervisorPanel.tsx`](../frontend/src/SupervisorPanel.tsx:1) (moderno) + [`frontend/src/ClassicSupervisorPanel.tsx`](../frontend/src/ClassicSupervisorPanel.tsx:1) (clásico)
- Admin UI: [`frontend/src/TenantAdminPanel.tsx`](../frontend/src/TenantAdminPanel.tsx:1) (moderno) + [`frontend/src/ClassicTenantAdminPanel.tsx`](../frontend/src/ClassicTenantAdminPanel.tsx:1) (clásico)
- Routing is native, based on `window.location.pathname`, with no router dependency.
- **Dual Theme:** Theme state persisted in `localStorage` with key `kavana_theme`, floating toggle button for real-time switching.

Industrial UI rules:

- Vision tunnel.
- One primary action per screen.
- Touch targets minimum 64px.
- **Dual Theme:** Classic ERP (tables, light backgrounds) + Modern Kavana (cards, dark backgrounds).
- No nested menus on the factory floor.
- Prevent double-click mutations with `isMutating` / `isSyncing`.

## Backend interceptors and tenant context

Backend tenant context must be propagated safely:

- JWT claims provide tenant identity.
- `tenant_id` must not be trusted from body, query, or unsigned headers.
- `AsyncLocalStorage.run()` is allowed.
- `AsyncLocalStorage.enterWith()` is prohibited.
- Transactions must start before `SET LOCAL app.current_tenant_id`.
- `SET SESSION` is prohibited with PgBouncer Transaction Pooling.
- The DB role `kavana_app` must not have `BYPASSRLS`.

Main files:

- [`docs/technical/02_backend-auth-context.md`](technical/02_backend-auth-context.md:1)
- [`backend/src/auth/tenant-context.middleware.ts`](../backend/src/auth/tenant-context.middleware.ts:1)
- [`backend/src/db/withTenantTransaction.ts`](../backend/src/db/withTenantTransaction.ts:1)

## API timeout rule

Every frontend API call must use `AbortController` with a strict 4-second timeout.

Main file:

- [`frontend/src/api/client.ts`](../frontend/src/api/client.ts:1)

## Offline-first persistence

Operator state and production events must persist locally before network sync.

Main files:

- [`frontend/src/db/local-db.ts`](../frontend/src/db/local-db.ts:1)
- [`frontend/src/store/hmi-store.ts`](../frontend/src/store/hmi-store.ts:1)

## AI orchestration outputs

Automated NotebookLM outputs must not be automatically re-ingested into the permanent notebook.

Default synced output directory:

```text
docs/ai/outputs/
```

Optional local cache directory to avoid Drive feedback loops:

```text
tools-ai/notebooklm/outputs/
```

Automated outputs must be reviewed before becoming official documentation. Use `KAVANA_NOTEBOOKLM_OUTPUT_DIR` or `--output-dir` when you need local cache outside Google Drive.
