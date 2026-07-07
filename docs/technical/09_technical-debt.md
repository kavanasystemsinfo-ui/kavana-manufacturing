# Kavana V3 - Deuda Técnica y Brechas Detectadas

## Estado del documento

- **Estado:** Actualizado tras unificación de tablas, guías de usuario en todos los paneles, type casting hardening en queries SQL, y diagnóstico de tsx watch en Windows.
- **Última actualización:** 2026-07-07.

## Brechas de implementación

| Área | Brecha | Severidad | Estado |
|---|---|---:|---|
| Backend | ~~Falta endpoint de capacidades por tenant~~ | Alta | **Resuelto** |
| Backend | ~~Falta guard backend por `feature_matrix`~~ | Alta | **Resuelto** |
| Backend | ~~Falta validador de custom fields~~ | Alta | **Resuelto** (Zod `.strict()` + meta-validación) |
| Backend | ~~Falta freno de cuota de custom fields~~ | Alta | **Resuelto** (`max_custom_fields`) |
| Backend | Falta enforcear inmutabilidad de `hard_limits` por rol/backend | Alta | Pendiente |
| Backend | Falta autenticación mínima con JWT real/JWKS | Crítica | Pendiente |
| Backend | Falta test de contexto ausente en middleware | Crítica | Pendiente |
| Backend | ~~Falta test de tenant mismatch en `syncOfflineTimeLog`~~ | Alta | **Resuelto** (se eliminó el check rígido; `context.tenantId` es la fuente de verdad para offline events) |
| Backend | Falta hardening de errores HTTP para no enumerar recursos ajenos | Alta | Pendiente |
| Backend | ~~Falta actualizar `produced_quantity`/`defect_quantity` en transición `stop`~~ | Media | **Resuelto** (`syncWorkBlock()` actualiza ambas tablas `production_orders` y `orders`) |
| Backend | Desconexión entre `orders` (supervisor) y `production_orders` (HMI) | Alta | **Resuelto** (`OrdersService` mirror CRUD + `lockOrder` auto-repair + migración 019) |
| Frontend | ~~El HMI usa constantes demo de orden, puesto y operario~~ | Alta | **Resuelto** (AdminPanel CRUD Users/Workstations/Models) |
| Frontend | ~~Falta selección real de orden/puesto/operario~~ | Alta | **Resuelto** (AdminPanel tabs con CRUD completo) |
| Frontend | ~~Falta panel admin CRUD de Users, Workstations, Manufacturing Models~~ | Alta | **Resuelto** (AdminPanel.tsx + ClassicAdminPanel.tsx) |
| Frontend | ~~Falta renderizado dinámico de `custom_fields` en OperatorPanel~~ | Alta | **Resuelto** |
| Frontend | ~~Panel muestra UUIDs truncados en vez de nombres reales~~ | Alta | **Resuelto** (GET /production/operator/context con COALESCE) |
| Frontend | ~~Operario no puede ver ni elegir órdenes disponibles~~ | Alta | **Resuelto** (GET /orders/available + pantalla de selección con búsqueda) |
| Frontend | Falta modal TERMINAR con captura de cantidad producida y scrap | Media | Pendiente |
| Frontend | Falta Service Worker/PWA shell | Media | Pendiente |
| Frontend | ~~Falta documentación de sistema de temas dual~~ | Media | **Resuelto** |
| Seguridad | Falta test PgBouncer Transaction Pooling | Alta | Pendiente |
| Documentación | ~~Falta actualizar documentación comercial con avance Fase 5.4~~ | Media | **Resuelto** |

## Riesgos técnicos

- Data Bleeding por consultas sin `tenant_id`.
- Fuga de contexto por uso incorrecto de `SET SESSION`.
- Contaminación de `AsyncLocalStorage` si se usa `enterWith()`.
- Duplicidad de eventos offline.
- Corrupción de estados si no se valida la máquina de estados.
- Estado optimista del HMI divergente del servidor tras recarga.
- Eventos offline rechazados por reglas de negocio quedan en dead-letter sin flujo administrativo de revisión.
- `hard_limits` puede ser modificado si el backend expone update sin control de rol.
- `tenant_feature_enabled` puede convertirse en superficie de enumeración si se expone públicamente.

## Riesgos mitigados en esta iteración

| Riesgo | Mitigación aplicada | Evidencia |
|---|---|---|
| Falta de mecanismo para ejecutar SQL real sin `psql` | Runner Node.js con `pg`, Docker opcional y soporte para `DATABASE_URL` | [`database/scripts/run-postgres-smoke.js`](database/scripts/run-postgres-smoke.js:1) |
| Falta de script raíz para smoke SQL | Script npm `database:smoke` | [`package.json`](package.json:18) |
| Documentación SQL dependiente de `psql` | README actualizado con modo sin `psql` | [`database/README.md`](database/README.md:47), [`database/tests/README.md`](database/tests/README.md:1) |
| Migraciones y smoke tests no ejecutados contra PostgreSQL real | `npm run database:smoke` ejecutado contra PostgreSQL 18 en Docker | Validación final: migraciones `000..005`, grants y smoke tests `001..002` aprobados |
| Grants insuficientes para `kavana_app` | Grants explícitos en `public` y default privileges | [`database/migrations/000_extensions_roles_rls.sql`](database/extensions_roles_rls.sql:20) |
| Trigger de auditoría apuntaba a `NEW.tenant_id` inexistente en `tenants` | Corregido a `NEW.id` | [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:256) |
| Test de auditoría esperaba 3 eventos cuando solo se generan 2 cambios | Ajustado a mínimo 2 auditorías | [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:95) |
| Feature matrix inconsistente entre tenants | Normalización DB con semilla y preservación de módulos existentes | [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:98) |
| Límites duros mezclados con cuotas editables | Separación `resource_quotas` / `hard_limits` | [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:74) |
| Cambios críticos sin trazabilidad | Auditoría DB en `tenant_config_audit` | [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:193) |
| Invalidación de caché sin contador | `governance_version` monótono | [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:168) |
| Eventos offline duplicables | Idempotencia por `client_event_id` | [`backend/src/core-mes-production/core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:216) |
| Estado crítico solo en memoria | IndexedDB/Dexie para `offlineLogs` y `failedLogs` | [`frontend/src/db/local-db.ts`](frontend/src/db/local-db.ts:20) |
| Doble clic / concurrencia UI | Bloqueo mediante `isMutating` e `isSyncing` | [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:93) |
| API sin timeout | `AbortController` con 4s | [`frontend/src/api/client.ts`](frontend/src/api/client.ts:1) |
| Cola bloqueada por fallo | Movimiento a dead-letter | [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:112) |
| Endpoints premium accesibles sin licencia | Guard global `@RequireFeature()` con `APP_GUARD` | [`require-feature.guard.ts`](backend/src/tenant-capabilities/require-feature.guard.ts:1) |
| Módulos desconocidos devuelven acceso | `KNOWN_MODULE_KEYS` set + fail-safe `false` | [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:11) |
| Caché de capacidades inconsistente | Invalidación por `governance_version` + TTL 60s | [`capabilities-cache.ts`](backend/src/tenant-capabilities/capabilities-cache.ts:1) |
| Transiciones inválidas | Tests de máquina de estados | [`backend/src/core-mes-production/state-machine.spec.ts`](backend/src/core-mes-production/state-machine.spec.ts:1) |
| DTO offline inseguro | Validación Zod de tenant, UUID y motivo de parada | [`backend/src/core-mes-production/dto.spec.ts`](backend/src/core-mes-production/dto.spec.ts:1) |
| Endpoints admin expuestos | RBAC con `@RequireRole('tenant_admin')` | [`roles.guard.ts`](backend/src/auth/roles.guard.ts:1) |
| Dependencias frontend pesadas / rotas | Router nativo zero-dependencies (`window.location`) | [`App.tsx`](frontend/src/App.tsx:1) |
| Modificación silenciosa de feature flags | Mutación con log transaccional obligatorio en BD | [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:85) |
| Llamadas API sin abort/timeout en Admin Panel | Refactorizado para usar `callApiWithTimeout` obligatorio (4s) | [`frontend/src/api/admin.ts`](frontend/src/api/admin.ts:14) |
| Volatilidad de capacidades del tenant ante offline | Persistencia local de capacidades en IndexedDB (`tenantConfig`) | [`frontend/src/db/local-db.ts`](frontend/src/db/local-db.ts:21), [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:89) |
| Hardcoding de `DEMO_TENANT_ID = '1'` en HMI | Eliminación y resolución dinámica nativa del context vía claims JWT | [`frontend/src/OperatorPanel.tsx`](frontend/src/OperatorPanel.tsx), [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:32) |
| Custom fields sin validación backend | Meta-validación Zod + validación dinámica `.strict()` + freno de cuota | [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:132), [`core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:22) |
| Custom fields sin panel de administración | Editor visual con sanitización, control de cuota y botones ≥64px | [`TenantAdminPanel.tsx`](frontend/src/TenantAdminPanel.tsx:234) |

## Próximas prioridades

1. **Cerrar Fase 5.4:** Renderizado dinámico de custom fields en OperatorPanel + modal TERMINAR + backend `produced_quantity`/`defect_quantity`.
2. Implementar autenticación mínima con JWKS/rotación formal.
3. Añadir tests de contexto ausente y tenant mismatch.
4. Crear endpoint administrativo para órdenes y puestos reales.
5. Reemplazar constantes demo del HMI por selección real de contexto (orden, puesto, operario).
6. Añadir Service Worker/PWA shell.
7. Añadir pruebas E2E offline-first.
8. Ejecutar test PgBouncer Transaction Pooling cuando haya infraestructura de pool configurada.

