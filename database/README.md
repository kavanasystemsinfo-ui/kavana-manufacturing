# Kavana Manufacturing - Database

Este directorio contiene las migraciones PostgreSQL que construyen el núcleo seguro de Kavana Manufacturing.

## Estado del documento

- **Última actualización:** 2026-07-04. Smoke runner actualizado con migraciones 000-013.

## Principios

- PostgreSQL 18.
- Shared-schema multi-tenant.
- `tenant_id BIGINT NOT NULL` en toda entidad multi-tenant.
- `PRIMARY KEY (tenant_id, id)`.
- FK compuestas.
- Índices liderados por `tenant_id`.
- RLS activado y forzado.
- Rol de aplicación `kavana_app`.
- `SET LOCAL app.current_tenant_id` en backend.

## Migraciones

1. `000_extensions_roles_rls.sql`
   - Extensiones.
   - Rol `kavana_app`.
   - Funciones base RLS.
   - Función `set_updated_at()`.

2. `001_tenants_users.sql`
   - Tenants.
   - Usuarios.
   - Roles.
   - RLS inicial.

3. `002_workstations.sql`
   - Puestos de trabajo.

4. `003_production_orders.sql`
   - Órdenes de producción.

5. `004_production_time_logs.sql`
   - Logs de tiempos y eventos de planta.

6. `005_tenant_governance.sql`
   - Normalización de `feature_matrix`.
   - Separación entre cuotas editables y `hard_limits`.
   - `custom_fields_schema`.
   - `governance_version` para invalidación de caché.
   - Auditoría de cambios críticos en `tenant_config_audit`.

7. `006_refactor_production_blocks.sql`
   - Renombra `production_time_logs` a `production_work_blocks`.
   - Columns `type`, `start_time`, `end_time`.
   - CHECK constraints: `start_time < end_time`, type-based validation.

8. `007_manufacturing_models.sql`
   - Tabla `manufacturing_models`.
   - RLS + índice por `tenant_id`.

9. `008_fix_users_and_seed.sql`
   - Cambia `email`+`name` por `username`+`password_hash`.
   - Seed tenant id=1.

10. `009_admin_orders.sql`
    - Tabla `orders` para admin panel CRUD.
    - RLS + trigger `set_updated_at`.

11. `010_replace_estimated_minutes_with_unit.sql`
    - Reemplaza `estimated_minutes` por `unit_of_measure` (nullable).
    - CHECK constraint: piezas/h, m/h, kg/h, L/h.

12. `011_add_target_rate_to_manufacturing_models.sql`
    - Añade `target_rate NUMERIC(12,2)` nullable a `manufacturing_models`.
    - Usado por módulo OEE para cálculo de rendimiento.

13. `012_create_quality_checks.sql`
    - Tabla `quality_checks` para módulo de calidad.
    - RLS + índices por tenant, order, workstation, result, fecha.

14. `013_create_cost_entries.sql`
    - Tabla `cost_entries` para módulo de costes.
    - Categorías: material, labor, overhead, energy.
    - RLS + índices por tenant, order, category, fecha.

## Tests manuales

- [`tests/001_rls_isolation_smoke.sql`](tests/001_rls_isolation_smoke.sql:1) valida aislamiento RLS tras las migraciones `000..004`.
- [`tests/002_tenant_governance_smoke.sql`](tests/002_tenant_governance_smoke.sql:1) valida gobernanza de tenant tras aplicar la migración `005`.

## Ejecución real sin `psql`

Para evitar depender de `psql` instalado en PATH, existe un runner Node.js que usa `pg` y puede levantar PostgreSQL con Docker o conectarse a una base existente:

```bash
npm run database:smoke
```

El comando anterior intenta crear un contenedor efímero `postgres:18`, aplica migraciones `000..013`, verifica grants de `kavana_app` y ejecuta los smoke tests.

Si ya existe una base PostgreSQL, no se necesita Docker:

```bash
npm run database:smoke -- --database-url="$DATABASE_URL"
```

Modos útiles:

- `--apply-only`: aplica migraciones y verifica grants sin ejecutar tests.
- `--tests-only`: ejecuta tests contra una base ya migrada.

Si Docker no está disponible y no hay `DATABASE_URL`, el runner informa el bloqueo de infraestructura local.
