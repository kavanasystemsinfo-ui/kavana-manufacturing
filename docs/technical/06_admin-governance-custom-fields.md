# Kavana Manufacturing - Gobernanza JSONB y Custom Fields

## Estado del documento

- **Estado:** Fase 13 completada + UsersTab con campos V2 + guías de usuario en AdminPanel (moderno + clásico). 8 paneles con HelpModal integrado.
- **Última actualización:** 2026-07-07.
- **Fuente maestra:** [07_MASTER_ADMIN_Gobernanza_JSONB_y_CustomFields.md](root/07_MASTER_ADMIN_Gobernanza_JSONB_y_CustomFields.md:1).

## Objetivo

Definir la gobernanza de configuración de tenant, campos personalizados y validación dinámica.

## Estándar obligatorio

- Métricas universales en columnas rígidas.
- Variables sectoriales en `custom_fields JSONB`.
- Esquema dinámico en `tenants.custom_fields_schema`.
- Validación backend con Zod/Ajv u otro validador runtime.
- Validación estricta: rechazar campos no declarados.
- Respetar `resource_quotas.entities.max_custom_fields`.
- Tenant Admin no puede alterar límites duros.
- Auditoría en cambios críticos.

## Implementado en Fase 5.1

- `tenants.custom_fields_schema JSONB` en [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:188).
- `tenants.hard_limits JSONB` separado de cuotas editables en [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:189).
- `tenants.governance_version` para invalidación de caché en [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:190).
- Auditoría de cambios críticos en [`tenant_config_audit`](database/migrations/005_tenant_governance.sql:193).
- Test manual de gobernanza en [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:1).

## Implementado en Fase 5.4 (Backend + Admin)

- Meta-validación Zod del esquema admin con `CustomFieldsSchemaValidator` en [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:132).
- Freno de cuota `max_custom_fields` en [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:150).
- Validación dinámica Zod `.strict()` en `createOrder` en [`core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:22).
- Editor visual de campos personalizados en [`TenantAdminPanel.tsx`](frontend/src/TenantAdminPanel.tsx:234).
- Variante clásica ERP en [`ClassicTenantAdminPanel.tsx`](frontend/src/ClassicTenantAdminPanel.tsx:1) — tablas, fondos claros, botones de acción.
- API frontend `updateCustomFieldsSchema` con timeout 4s en [`admin.ts`](frontend/src/api/admin.ts:50).
- Tests: [`custom-fields-validation.spec.ts`](backend/src/core-mes-production/custom-fields-validation.spec.ts) y [`custom-fields-governance.spec.ts`](backend/src/tenant-capabilities/custom-fields-governance.spec.ts).

## Panel Admin - Fase 5.5 (CRUD Completo)

### Nuevo Admin Panel con CRUD de Entidades
- **API client:** `admin-entities.ts` → CRUD Users, Workstations, Manufacturing Models, Orders + Capabilities.
- **AdminPanel.tsx** (Moderno): Dark theme, 6 tabs, inline editing, glassmorphism.
- **ClassicAdminPanel.tsx** (Clásico): Light theme ERP, tablas HTML, badging semántico.

### Tabs Implementados
- **Usuarios:** CRUD con roles (tenant_admin/supervisor/operario), inline editing, badges de rol. **Campos V2** (paridad con V2):
  - `first_name`, `last_name` (nombre real del operario)
  - `employee_number` (número de ficha)
  - `is_active` (toggle activo/inactivo)
  - `operator_category` (peon_especialista, oficial_3, oficial_2, oficial_1)
  - `default_workstation_id` (puesto predeterminado)
  - Implementado en **AdminPanel.tsx** (moderno) y **ClassicAdminPanel.tsx** (clásico) con paridad completa
- **Puestos de Trabajo:** CRUD con estados (active/inactive), inline editing.
- **Modelos de Manufactura:** CRUD con campos (name, workstation_id, unit_of_measure opcional OEE, target_rate opcional OEE), inline editing.
- **Órdenes:** Vista read-only con estados, métricas producidas/defectos, JOINs a modelo y puesto.
- **Módulos:** Feature flags toggle on/off.
- **Campos Personalizados:** Editor visual con clave/tipo/requerido + label editable.

## Brechas actuales

- ~~No existe validador backend.~~ → **Resuelto** (Zod `.strict()` + meta-validación).
- ~~No existe panel de administración.~~ → **Resuelto** (AdminPanel con CRUD completo de entidades).
- ~~No existe CRUD de Users/Workstations/ManufacturingModels en frontend~~ → **Resuelto** (AdminPanel tabs).
- ~~`estimated_minutes` hardcodeado en Manufacturing Models~~ → **Resuelto** (unit_of_measure + target_rate, solo visible con OEE activo).
- No existe renderizado dinámico de `custom_fields` en OperatorPanel.
- No existe modal de finalización con captura de cantidades.
- No existe flujo administrativo de revisión de dead-letter.

## Manufacturing Models - Schema actual

```sql
CREATE TABLE manufacturing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  unit_of_measure TEXT CHECK (unit_of_measure IN ('piezas/h', 'm/h', 'kg/h', 'L/h')),
  target_rate NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- `unit_of_measure`: Nullable. Solo se llena si el módulo `oee_monitoring` está activo.
- `target_rate`: Nullable. Meta de producción por hora. Solo visible si OEE activo + unidad seleccionada.
- Frontend consulta `fetchCapabilities()` y renderiza condicionalmente.

## Riesgos

- Corrupción analítica por tipos incorrectos.
- Tenant puede romper esquemas compartidos.
- UI muestra campos no soportados.
- Límites de recursos ignorados.

## Criterio de aceptación futuro

- ✅ Tenant puede definir campos personalizados.
- ✅ Backend valida tipos y required.
- HMI recibe esquema al arranque (pendiente: renderizado en OperatorPanel).
- ✅ Cambios críticos quedan auditados.

