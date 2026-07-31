# Kavana Manufacturing - Auditoría Multi-Tenancy y RLS

## Estado del documento

- **Estado:** Auditoría actualizada con 136 tests, dual theme, y guías de usuario, unificación completada, type casting hardening, Graphify integrado.
- **Última actualización:** 2026-07-07.
- **Fuente maestra:** [01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md](root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md:1).

## Objetivo

Documentar y auditar el modelo de aislamiento multi-tenant basado en PostgreSQL, RLS y `tenant_id`.

## Estándar obligatorio

Toda entidad multi-tenant debe cumplir:

- `tenant_id BIGINT NOT NULL`.
- `PRIMARY KEY (tenant_id, id)`.
- Índices compuestos liderados por `tenant_id`.
- Restricciones `UNIQUE` locales por tenant.
- FK compuestas que incluyan `tenant_id`.
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- `ALTER TABLE ... FORCE ROW LEVEL SECURITY`.
- Política RLS Fail-Closed basada en `app.current_tenant_id`.

## Estado actual

Existe una base de migraciones SQL para el núcleo multi-tenant:

- Rol `kavana_app` y función `get_current_tenant()` en [`database/migrations/000_extensions_roles_rls.sql`](database/migrations/000_extensions_roles_rls.sql:1).
- Tablas `tenants` y `users` en [`database/migrations/001_tenants_users.sql`](database/migrations/001_tenants_users.sql:1).
- Tabla `workstations` en [`database/migrations/002_workstations.sql`](database/migrations/002_workstations.sql:1).
- Tabla `production_orders` en [`database/migrations/003_production_orders.sql`](database/migrations/003_production_orders.sql:1).
- Tabla `production_time_logs` en [`database/migrations/004_production_time_logs.sql`](database/migrations/004_production_time_logs.sql:1).
- Gobernanza de tenant en [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:1).

Cumple en diseño SQL:

- `tenant_id BIGINT NOT NULL` en entidades multi-tenant.
- PK compuesta `(tenant_id, id)` en entidades multi-tenant.
- Índices compuestos liderados por `tenant_id`.
- Índices únicos locales por tenant.
- FK compuestas cuando relaciona entidades multi-tenant.
- RLS activado y forzado en tablas multi-tenant.
- Política Fail-Closed basada en `app.current_tenant_id`.
- `tenant_config_audit` con RLS activado y forzado.
- `feature_matrix`, `custom_fields_schema`, `hard_limits` y `governance_version`.

Validación real:

- `npm run database:smoke` pasó contra PostgreSQL 18 en Docker.
- [`database/tests/001_rls_isolation_smoke.sql`](database/tests/001_rls_isolation_smoke.sql:1) pasó.
- [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:1) pasó.
- Grants de `kavana_app` sobre tablas multi-tenant fueron verificados.

Brechas detectadas:

- `tenants` es una tabla global SaaS y no usa RLS por diseño; su exposición debe estar protegida por backend y rol administrativo.
- `hard_limits` está separado, pero su inmutabilidad para Tenant Admin debe ser enforceada por backend/rol, no solo por convención documental.
- `tenant_feature_enabled(BIGINT, TEXT)` es un helper de backend; no debe exponerse como API pública sin validación de identidad.

## Riesgos críticos

- Data Bleeding si alguna consulta omite `tenant_id`.
- Fuga por `SET SESSION` en PgBouncer Transaction Pooling.
- Enumeración transversal si los errores distinguen entre recurso inexistente y recurso ajeno.
- Índices únicos globales que revelen existencia de datos entre tenants.

## Criterio de aceptación futuro

Ninguna migración nueva debe fusionarse si no incluye:

- `tenant_id`.
- PK compuesta.
- RLS activado y forzado.
- Política Fail-Closed.
- FK compuesta cuando relacione entidades multi-tenant.
