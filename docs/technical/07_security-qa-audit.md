# Kavana Manufacturing - QA y Auditoría de Seguridad

## Estado del documento

- **Estado:** Auditoría actualizada con dual theme, guías de usuario, y 136 tests, unificación completada, type casting hardening, Graphify integrado.
- **Última actualización:** 2026-07-07.
- **Fuente maestra:** [kavana-v3-qa-security-review-skill.md](root/skills/kavana-v3-qa-security-review-skill.md:1).

## Objetivo

Mantener una auditoría continua orientada a prevenir Data Bleeding, corrupción de estados y fallos offline.

## Riesgos críticos a controlar

- Queries sin `tenant_id`.
- Índices únicos globales.
- FK simples entre entidades multi-tenant.
- Tablas sin RLS.
- RLS sin `FORCE ROW LEVEL SECURITY`.
- `SET SESSION` en PgBouncer Transaction Pooling.
- `AsyncLocalStorage.enterWith()`.
- Tenant extraído desde inputs no firmados.
- Eventos offline no persistentes.
- API sin `AbortController`.
- Módulos renderizados sin validar `feature_matrix`.
- **Dual Theme:** Risk de inconsistencia visual entre temas (mitigado por Zustand store compartido).

## Pruebas mínimas futuras

1. Fuga transversal.
   - Tenant A intenta leer recurso de Tenant B.
   - Resultado esperado: 404 o vacío.

2. Inserción cruzada.
   - Tenant A intenta insertar con `tenant_id` de Tenant B.
   - Resultado esperado: rechazo por RLS o validación.

3. Contexto ausente.
   - Query sin `app.current_tenant_id`.
   - Resultado esperado: cero filas.

4. PgBouncer.
   - Dos transacciones consecutivas en la misma conexión.
   - Resultado esperado: no hay contaminación de tenant.

5. Offline.
   - Evento sin red.
   - Resultado esperado: persistencia en IndexedDB y sincronización FIFO posterior.

6. Dual Theme.
   - Cambio de tema no pierde estado de negocio.
   - Resultado esperado: Zustand store preservado.

## Estado actual

- Existe backend NestJS mínimo con validación RS256 mediante clave pública configurada.
- Existe middleware de contexto con `AsyncLocalStorage.run()`.
- Existe transacción con `SET LOCAL app.current_tenant_id`.
- Existe SQL base para tenants, usuarios, puestos, órdenes, logs y gobernanza.
- `npm run database:smoke` pasó contra PostgreSQL 16 en Docker.
- [`database/tests/001_rls_isolation_smoke.sql`](database/tests/001_rls_isolation_smoke.sql:1) pasó.
- [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:1) pasó.
- Grants de `kavana_app` sobre tablas multi-tenant fueron verificados.
- Falta guard backend por `feature_matrix`.
- Falta validación JWKS/rotación formal de claves.
- Falta test PgBouncer Transaction Pooling con pool real.
- La auditoría debe ejecutarse en cada iteración `$d`.

## Hallazgos de auditoría `$d`

- [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:1) introduce separación entre `resource_quotas` editables y `hard_limits`, pero la inmutabilidad de `hard_limits` para Tenant Admin debe enforcearse en backend/rol.
- [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:172) expone un helper SQL `tenant_feature_enabled`; debe usarse solo como helper backend interno, no como superficie pública.
- El runner SQL real detectó grants insuficientes para `kavana_app` y obligó a corregir [`database/migrations/000_extensions_roles_rls.sql`](database/migrations/000_extensions_roles_rls.sql:20).
- El runner SQL real detectó que el trigger de auditoría apuntaba a `NEW.tenant_id` inexistente; se corrigió a `NEW.id` en [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:256).
- [`docs/technical/01_multi-tenancy-rls-audit.md`](docs/technical/01_multi-tenancy-rls-audit.md:1) queda actualizado con validación real.
- [`docs/technical/02_backend-auth-context.md`](docs/technical/02_backend-auth-context.md:1) queda actualizado para diferenciar backend mínimo implementado de autenticación JWKS pendiente.
