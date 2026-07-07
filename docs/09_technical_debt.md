# 09 Technical Debt - Control Document for Roo Code

## Purpose

This root-level document gives Roo Code a compact list of known risks, technical debt, and forbidden breakages while automating Kavana V3.

Canonical detailed source: [`docs/technical/09_technical-debt.md`](technical/09_technical-debt.md:1).

## Current status

- **Tests:** 136 passing (backend). TypeScript compila limpio (frontend).
- **Last update:** 2026-07-04. Documentation Loop completed for Fase 5.5.

## Critical debts that must not be worsened

| Area | Debt | Severity | Status |
|---|---|---:|---|
| Backend | Falta autenticación mínima con JWT real/JWKS | Crítica | Pendiente |
| Backend | Falta test de contexto ausente en middleware | Crítica | Pendiente |
| Backend | Falta test de tenant mismatch en `syncOfflineTimeLog` | Alta | Pendiente |
| Backend | Falta hardening de errores HTTP para no enumerar recursos ajenos | Alta | Pendiente |
| Backend | Falta enforcear inmutabilidad de `hard_limits` por rol/backend | Alta | Pendiente |
| Frontend | El HMI usa constantes demo de orden, puesto y operario | Alta | Pendiente |
| Frontend | Falta selección real de orden/puesto/operario | Alta | Pendiente |
| Frontend | Falta renderizado dinámico de `custom_fields` en OperatorPanel | Alta | Pendiente |
| Frontend | Falta modal TERMINAR con captura de cantidad producida y scrap | Media | Pendiente |
| Frontend | Falta Service Worker/PWA shell | Media | Pendiente |
| Seguridad | Falta test PgBouncer Transaction Pooling | Alta | Pendiente |

## Resolved in recent iterations

- Endpoint de capacidades por tenant.
- Guard backend por `feature_matrix`.
- Validador de custom fields con Zod `.strict()` y meta-validación.
- Freno de cuota de custom fields.
- Migraciones y smoke tests contra PostgreSQL real.
- Grants de `kavana_app`.
- Corrección del trigger de auditoría.
- Normalización de `feature_matrix`.
- Separación `resource_quotas` / `hard_limits`.
- Auditoría DB en `tenant_config_audit`.
- Invalidación de caché con `governance_version`.
- Idempotencia offline por `client_event_id`.
- Persistencia local con IndexedDB/Dexie.
- Bloqueo de doble clic mediante `isMutating` e `isSyncing`.
- API timeout de 4s con `AbortController`.
- Movimiento a dead-letter cuando falla la cola.
- Guard global `@RequireFeature()`.
- `KNOWN_MODULE_KEYS` fail-safe.
- RBAC admin con `@RequireRole('tenant_admin')`.
- Router frontend zero-dependencies.
- Mutación de feature flags con log transaccional obligatorio.
- Persistencia local de capacidades del tenant.

## Non-negotiable safety rules

Roo Code must not break:

- `tenant_id` in every multi-tenant query and mutation.
- PostgreSQL RLS policies.
- Composite PK/FK design `(tenant_id, id)`.
- `AsyncLocalStorage.run()` tenant propagation.
- Prohibition of `AsyncLocalStorage.enterWith()`.
- `SET LOCAL` inside an explicit transaction.
- Prohibition of `SET SESSION` with PgBouncer Transaction Pooling.
- 4-second API timeout with `AbortController`.
- IndexedDB persistence for offline-critical state.
- Feature flag JSONB governance and audit trail.
- Industrial HMI touch targets of at least 64px.

## AI orchestration debt

Current automation risks:

- NotebookLM UI selectors can change.
- External source ingestion depends on Google UI flows.
- Temporary sources must be cleaned with `--clean-temp-sources`.
- Automated outputs must not be re-ingested into the permanent notebook.
- Roo Code must stop and wait for explicit `procede` before modifying code after NotebookLM synthesis.
