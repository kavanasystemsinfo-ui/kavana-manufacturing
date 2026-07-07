# Kavana V3 - Modularidad y Feature Flags JSONB

## Estado del documento

- **Estado:** Fase 5.5 completada. Dual theme + admin CRUD + guías de usuario + OEE como módulo opcional, unificación completada, type casting hardening, Graphify integrado.
- **Última actualización:** 2026-07-07.
- **Fuente maestra:** [03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md](root/03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md:1).

## Objetivo

Definir el sistema de modularidad de Kavana V3 mediante `feature_matrix` JSONB.

## Estándar obligatorio

- Cada módulo nuevo debe vivir en una carpeta independiente.
- Cada módulo debe declararse en `feature_matrix.modular_matrix`.
- Backend debe validar módulos con guard decorativo, por ejemplo `@RequireFeature('module_key')`.
- Frontend debe recibir capacidades evaluadas, no preguntar flags directamente.
- Caché recomendada:
  - L1 memoria local con TTL corto.
  - L2 Redis con TTL largo.
  - Fallback seguro a PostgreSQL.
  - SingleFlight para evitar cache stampede.
- Invalidación de caché ante cambios de `feature_matrix`.

## Módulos previstos

- `core_mes`.
- `oee_monitoring`.
- `quality_assurance`.
- `cost_management`.

## Implementado en Fase 5.1

- Tabla `tenants` con `feature_matrix JSONB`.
- Semilla normalizada en [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:6).
- Normalización de módulos premium con preservación de módulos existentes.
- Separación entre `resource_quotas` editables y `hard_limits` no editables.
- Función helper [`tenant_feature_enabled(BIGINT, TEXT)`](database/migrations/005_tenant_governance.sql:149).
- `governance_version` para invalidación de caché.
- Auditoría de cambios críticos en `tenant_config_audit`.

## Implementado en Fase 5.2

- Endpoint `GET /tenant/capabilities` en [`tenant-capabilities.controller.ts`](backend/src/tenant-capabilities/tenant-capabilities.controller.ts:1).
- Guard global `@RequireFeature('module_key')` en [`require-feature.guard.ts`](backend/src/tenant-capabilities/require-feature.guard.ts:1).
- Servicio con caché L1 en [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:1).
- Caché L1 en memoria (TTL 60s, invalidación por `governance_version`) en [`capabilities-cache.ts`](backend/src/tenant-capabilities/capabilities-cache.ts:1).
- Módulos desconocidos rechazados por `KNOWN_MODULE_KEYS` (fail-safe).
- 8 tests unitarios en [`tenant-capabilities.spec.ts`](backend/src/tenant-capabilities/tenant-capabilities.spec.ts:1).

## Implementado en Fase 5.4

- Dual Theme: Classic ERP + Moderno Kavana
- 6 componentes UI (3 modernos + 3 clásicos)
- Theme toggle flotante con persistencia localStorage
- Build exitoso con todos los componentes

## Implementado en Fase 5.3

- Decorador `@RequireRole('tenant_admin')` para asegurar endpoints administrativos.
- Endpoint `PATCH /tenant/capabilities/modules/:moduleKey` para alternar módulos vía `jsonb_set` transaccional.
- Auditoría automática a `tenant_config_audit` durante el toggle de módulos.
- Interfaz gráfica `TenantAdminPanel.tsx` consumiendo `GET` y `PATCH` de capabilities.
- Routing minimalista nativo en frontend separando Operario (`/`) y Admin (`/admin`).

## Comportamiento por módulo

### `oee_monitoring` (OEE)
- Cuando está **desactivado**: Manufacturing Models solo muestra nombre. Campos `unit_of_measure` y `target_rate` ocultos.
- Cuando está **activado**: Aparece select de unidad (piezas/h, m/h, kg/h, L/h) + input de meta de producción.
- Frontend consulta `fetchCapabilities()` al cargar la pestaña Modelos y renderiza condicionalmente.
- `unit_of_measure` y `target_rate` son nullable en la DB; se envían solo si OEE activo.

## Brechas actuales
- No existe caché L2 Redis (upgrade path documentado con `// ponytail:`).

## Riesgos

- Renderizar módulos no contratados.
- Ejecutar lógica premium sin validación backend.
- Caché inconsistente tras cambios de plan.
- JSONB demasiado grande y penalización TOAST.

## Criterio de aceptación futuro

- Tenant puede activar/desactivar módulos mediante configuración.
- Backend bloquea endpoints premium no activos.
- Frontend no muestra módulos desactivados.
- Cambios de configuración invalidan caché.
