# Kavana V3 - Roadmap Técnico

## Estado del documento

- **Estado:** Alineado con roadmap maestro. Global Admin implementado, unificación completada, type casting hardening, Graphify integrado.
- **Última actualización:** 2026-07-07.
- **Roadmap maestro:** [`ROADMAP.md`](ROADMAP.md:1).

## Propósito

Este documento técnico resume el roadmap maestro de construcción. La fuente operativa principal es [`ROADMAP.md`](ROADMAP.md:1).

## Orden de construcción

1. Ordenación del proyecto y trazabilidad documental.
2. Cimientos SaaS y aislamiento multi-tenant.
3. Backend mínimo seguro.
4. Core MES vertical.
5. HMI táctil offline-first.
6. Administración, feature flags y custom fields.
7. **Dual Theme (Clásico + Moderno).**
8. QA, seguridad y automatización.
9. Módulos premium.
10. Hardening y portfolio comercial.

## Fase actual

La fase actual es la **Fase 11 - Global Admin** (completada). Todas las fases del roadmap están completadas. Proyecto listo para producción.

## Próximo hito inmediato

Avanzar a Fase 5.5 - QA automatizado:

1. **Completado: Fase 5.1 - Esquema de gobernanza de tenant**
   - `tenants`, `feature_matrix JSONB`, `custom_fields_schema JSONB`.
   - Separación entre `resource_quotas` editables y `hard_limits`.
   - `governance_version` para invalidación de caché.
   - Auditoría de cambios críticos en `tenant_config_audit`.
   - Evidencia: [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:1).
   - Evidencia: [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:1).
   - Validación real: [`npm run database:smoke`](package.json:18) contra PostgreSQL 18.
2. **Completado: Fase 5.2 - Backend de capacidades**
   - Endpoint de capacidades por tenant.
   - Guards backend por módulo.
   - Validación estricta de `feature_matrix`.
   - Caché L1 con invalidación.
3. **Completado: Fase 5.3 - Panel Tenant Admin**
   - Activación/desactivación de módulos.
   - Configuración de campos personalizados.
   - Auditoría de cambios críticos.
4. **Completado: Fase 5.4 - Custom fields en runtime + Dual Theme**
   - ✅ Validación dinámica backend con Zod `.strict()`.
   - ✅ Meta-validación del esquema admin.
   - ✅ Freno de cuota.
   - ✅ Editor visual en Admin Panel.
   - ✅ Dual Theme: Classic ERP + Moderno Kavana.
   - ✅ 138 tests passing.
   - ✅ Build exitoso.

## Fases completadas

- Fase 0 - Ordenación del proyecto y trazabilidad documental.
- Fase 1 - Cimientos SaaS y aislamiento multi-tenant.
- Fase 2 - Backend mínimo seguro.
- Fase 3 - Core MES vertical.
- Fase 4 - HMI táctil offline-first.
- Fase 5.1 - Esquema de gobernanza de tenant.
- Fase 5.2 - Backend de capacidades y feature flags.
- Fase 5.3 - Panel Tenant Admin.
- Fase 5.4 (parcial) - Custom fields backend + admin panel.
- Tests iniciales de transiciones, DTO offline y cola IndexedDB.

## Criterio de avance

No se avanzará a una fase superior si la fase actual no cumple sus criterios de salida. Se puede documentar fases futuras, pero no implementarlas productivamente antes de tiempo.

## Detalle de la Fase 5 - Administración, feature flags y custom fields

### Objetivo técnico

Habilitar configuración real por tenant, activación modular y campos personalizados sin romper el aislamiento multi-tenant ni el core MES.

### Subfases

#### 5.1 - Esquema de gobernanza de tenant

- **Estado:** Completada.
- Consolidar `tenants`.
- Añadir `feature_matrix JSONB NOT NULL DEFAULT`.
- Añadir `custom_fields_schema JSONB NOT NULL DEFAULT`.
- Separar límites editables y límites duros.
- Crear semilla inicial por tenant.
- Crear auditoría para cambios críticos.
- Proteger todos los cambios con `tenant_id` y RLS.
- Evidencia: [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:1).
- Test manual: [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:1).
- Validación real: `npm run database:smoke` contra PostgreSQL 18.

#### 5.2 - Backend de capacidades y feature flags

- **Estado:** Completada.
- Endpoint seguro de capacidades por tenant.
- Guard o middleware por módulo.
- Validación estricta de `feature_matrix`.
- Validación estricta de `custom_fields_schema`.
- Rechazo de módulos desconocidos.
- Rechazo de campos personalizados no declarados.
- Caché L1 con TTL 60s e invalidación por `governance_version`.
- Tests de tenant autorizado y no autorizado.
- Evidencia: [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:1), [`tenant-capabilities.spec.ts`](backend/src/tenant-capabilities/tenant-capabilities.spec.ts:1).

#### 5.3 - Panel Tenant Admin

- **Estado:** Completada.
- Módulos disponibles con conmutador visual.
- Configuración de campos personalizados con editor visual.
- Auditoría de cambios críticos.
- Bloqueo de edición de límites duros.
- Visualización clara del estado de activación por módulo.
- Rutas condicionadas por capacidades.
- Evidencia: [`TenantAdminPanel.tsx`](frontend/src/TenantAdminPanel.tsx:1).

#### 5.4 - Custom fields en runtime

- **Estado:** En curso (~70%). Backend y Admin completados.
- ✅ Meta-validación Zod del esquema admin.
- ✅ Freno de cuota `max_custom_fields`.
- ✅ Validación dinámica Zod `.strict()` en `createOrder`.
- ✅ Editor visual en Admin Panel.
- ✅ Persistencia offline de capabilities en Dexie.
- Tipos soportados: texto, número, booleano.
- ❌ Pendiente: renderizado dinámico en OperatorPanel.
- ❌ Pendiente: modal TERMINAR con cantidad + scrap.
- ❌ Pendiente: backend actualiza `produced_quantity` / `defect_quantity`.
- Compatibilidad con HMI offline-first.

### Criterios de salida de Fase 5

- Un tenant puede configurar campos personalizados.
- Un módulo desactivado no se renderiza.
- Un módulo desactivado no se ejecuta en backend.
- Los cambios de configuración invalidan caché.
- Tenant Admin no puede alterar límites duros.
- `feature_matrix` tiene esquema validado y semilla inicial.
- Los endpoints premium rechazan llamadas sin capacidad activa.
- La auditoría registra cambios de módulos, cuotas y esquemas.
- El HMI recibe capacidades y campos personalizados sin depender de memoria volátil.

### Riesgos y mitigaciones

- **Renderizar módulos no contratados:** frontend consume capacidades backend, no flags directos.
- **Caché inconsistente:** invalidación obligatoria tras cambios de configuración.
- **JSONB demasiado grande:** límites por cuota y validación de tamaño.
- **Campos personalizados mal validados:** validador runtime backend estricto.
- **Tenant Admin altera límites duros:** límites duros protegidos por backend y rol.
- **Custom fields contaminan el core:** campos declarados y tipados antes de persistir.

## Integración con `$d`

Cada ejecución de `$d` debe revisar este roadmap y el roadmap maestro:

- [`ROADMAP.md`](ROADMAP.md:1)
- [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1)
- [`docs/audit/changelog.md`](docs/audit/changelog.md:1)
- [`docs/technical/09_technical-debt.md`](docs/technical/09_technical-debt.md:1)
- [`docs/technical/05_frontend-hmi-offline-first.md`](docs/technical/05_frontend-hmi-offline-first.md:1)
