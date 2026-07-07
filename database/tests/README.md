# Database test suite

This directory contains deterministic database checks that complement the Vitest unit tests.

## Estado del documento

- **Última actualización:** 2026-07-04. Documentación actualizada con Fase 5.5.

## Recommended runner without `psql`

Use the root script when `psql` is not installed:

```bash
npm run database:smoke
```

It applies migrations `000..005`, verifies `kavana_app` grants, and runs both smoke scripts. By default it starts an ephemeral `postgres:18` Docker container. To use an existing PostgreSQL database instead:

```bash
npm run database:smoke -- --database-url="$DATABASE_URL"
```

Useful modes:

- `--apply-only`: apply migrations and verify grants only.
- `--tests-only`: run smoke tests against an already-migrated database.

## RLS isolation smoke test

[`001_rls_isolation_smoke.sql`](001_rls_isolation_smoke.sql) is a manual regression script for PostgreSQL after migrations `000..004` have been applied.

Execution shape with `psql`:

```bash
psql "$DATABASE_URL" -f database/tests/001_rls_isolation_smoke.sql
```

Execution shape without `psql` against an existing database:

```bash
npm run database:smoke -- --tests-only --database-url="$DATABASE_URL"
```

Expected contract:

- `visible_orders_for_tenant_9001` returns `1`.
- `leaked_orders_from_tenant_9001` returns `0`.
- The script runs inside `BEGIN` / `ROLLBACK`, so it does not mutate persistent data.

The script intentionally switches to the `kavana_app` role and uses `SET LOCAL app.current_tenant_id` to prove that RLS remains fail-closed under the same runtime assumptions as the backend transaction helper.

## Tenant governance smoke test

[`002_tenant_governance_smoke.sql`](002_tenant_governance_smoke.sql) is a manual regression script for PostgreSQL after migrations `000..005` have been applied.

Execution shape with `psql`:

```bash
psql "$DATABASE_URL" -f database/tests/002_tenant_governance_smoke.sql
```

Execution shape without `psql` against an existing database:

```bash
npm run database:smoke -- --tests-only --database-url="$DATABASE_URL"
```

Expected contract:

- `feature_matrix` is normalized with `schema_version = 3.1.0`.
- `core_mes` is enabled by default.
- Premium modules such as `oee_monitoring` are disabled by default.
- `hard_limits` contains non-editable limits such as `max_custom_fields`.
- `custom_fields_schema` remains a JSON object.
- Partial updates to `feature_matrix` preserve existing modules.
- `governance_version` increments after configuration changes.
- `tenant_config_audit` records critical configuration changes.
