# Kavana V3 - Changelog Documental

## 2026-07-07 — Diagnóstico, hardening y herramientas

### Fixed: Type casting en syncWorkBlock + tsx watch reload
- **Problema:** `could not determine data type of parameter $3` en INSERT INTO production_work_blocks. PostgreSQL no podía inferir tipos de parámetros BigInt/UUID.
- **Solución:** Casts SQL explícitos: `$1::bigint, $2::uuid, $3::uuid, ...`. Conversión `BigInt → String()` para tenantId en insertWorkBlock. Aplicado a todos los queries del servicio (lockOrder, overlapCheck, UPDATE orders, SELECT).
- **Nota:** `tsx watch` en Windows no detectó cambios — requiere Ctrl+C + `npm run dev` manual.

### Fixed: Password hashes rotos en tenant 2 (megalux)
- Formato `salt:sha256hex` reconstruido para ADMIN, SUPERVISOR, 5015.
- El endpoint `/auth/login` devuelve el primer usuario si hay duplicados entre tenants; usar `/auth/login-by-tenant` con `subdomain`.

### Fixed: Ambiguëdad TypeScript compilación
- `Property 'fields' does not exist on type '{}'` en core-mes-production.service.ts → casts `as any`.

### Added: Guías de usuario en todos los paneles
- `SUPERVISOR_HELP`, `OPERATOR_HELP`, `GLOBAL_ADMIN_HELP` en `help-content.ts`.
- HelpModal integrado en SupervisorPanel, OperatorPanel, GlobalAdminPanel (moderno + clásico).

### Added: Graphify — knowledge graph del proyecto
- Instalado `graphifyy` v0.9.8. Integración con OpenCode (`/graphify .`).
- Grafo generado con 1,975 nodos · 3,929 aristas · 236 comunidades (OpenRouter como backend).

### Tests
- 185 passing · TypeScript frontend limpio · Backend compila a `dist/`.

---

## 2026-07-06 — Unificación: `orders` como tabla canónica única

### Contexto
Existían dos tablas de órdenes paralelas: `orders` (supervisor/admin, inglés) y `production_orders` (operario HMI, español). El mirroring entre ellas causaba bugs recurrentes (RETURNING sin JOINs, FK divergentes, enums de estado inconsistentes). La tabla `production_work_blocks` nunca llegó a existir en dev porque la migración 004/006 no se aplicó correctamente.

### Decisión: Opción B — Unificación total
- **Eliminada la tabla `production_orders`.** Todo usa `orders`.
- Inglés como idioma canónico de status (`pending`, `in_progress`, `completed`, `cancelled`).
- UI mantiene etiquetas en español (capa de presentación).

### Added: Migraciones 020, 021, 022
- **020:** Crear `production_work_blocks` (idempotente: maneja tabla existente, `production_time_logs` legacy, o creación desde cero). Incluye columnas `produced_quantity`/`defect_quantity` (nunca creadas por migración 006).
- **021:** Añadir `code VARCHAR(100)` + índice `(tenant_id, UPPER(code))` a `orders`. `model_id` ahora nullable (legacy entries).
- **022:** Transferir datos de `production_orders` → `orders`, actualizar FK de `production_work_blocks`, dropear `production_orders`.

### Changed: Backend
- **`orders.service.ts`**: Eliminado todo el mirroring (PROD_STATUS_MAP, ORDER_STATUS_MAP, inserts/updates/deletes a production_orders). Single source of truth.
- **`core-mes-production.service.ts`**: `lockOrder`/`syncWorkBlock`/`insertWorkBlock` usan `orders`. Status inglés. Eliminado auto-repair (ya no hay dualidad).
- **`dto.ts`**: `PRODUCTION_ORDER_STATUSES` ahora `['pending', 'in_progress', 'completed']`.
- **`oee.service.ts`**: `production_orders` → `orders`.

### Changed: Frontend
- **`hmi-store.ts`**: `ProductionStatus` type ahora `'pending' | 'in_progress' | 'completed'`.
- **`OperatorPanel.tsx`**: `statusLabel` mapping soporta English keys → Spanish display.
- **`ClassicOperatorPanel.tsx`**: Misma actualización.

### Changed: Tests
- Todos los mocks de `production_orders` → `orders`, status español → inglés.
- `order-state-machine.spec.ts`, `sync-integrity.spec.ts`, `core-mes-production.service.spec.ts`, `orders.spec.ts` actualizados.

### Status: 185 tests backends pasando · TypeScript frontend limpio.

---

## 2026-07-05 - Fix: orders ↔ production_orders mirror + auto-repair + backfill

### Problem
- Supervisor creates orders in `orders` table; operator HMI (`core-mes-production`) reads/locks from `production_orders` table.
- Orders created before the dual-table mirror existed had no matching `production_orders` row.
- Operator sync failed with: "The requested production order does not exist or you do not have permission."
- `syncWorkBlock` also rejected offline events when the stored `tenant_id` did not match the authenticated tenant (legacy events from mock-token sessions).

### Changed: OrdersService mirrors CRUD to production_orders
- `createOrder`: generates UUID client-side, inserts into `orders` AND `production_orders` with field mapping:
  - `orders.quantity` → `production_orders.target_quantity`
  - `orders.status` → `production_orders.status` (pending→pendiente, in_progress→en_produccion, completed→completada)
  - `custom_fields.numero_orden` → `production_orders.code` (fallback `ORD-XXXXXXXX`)
- `updateOrder`: mirrors status/workstation/custom_fields changes to `production_orders`
- `deleteOrder`: deletes `production_orders` first (CASCADE work blocks), then `orders`

### Added: Migration 019 — backfill production_orders
- `database/migrations/019_backfill_production_orders.sql`
- Fills missing `production_orders` rows from existing `orders` rows for pre-fix orders.

### Added: Auto-repair in lockOrder
- `core-mes-production.service.ts` `lockOrder()` now auto-creates the missing `production_orders` row from `orders` if not found.
- This makes the operator HMI resilient even if the mirror fails or for orders created before the fix.

### Changed: syncWorkBlock uses authenticated tenant context
- Removed strict `dto.tenant_id !== context.tenantId` check.
- All DB operations in `syncWorkBlock` now use `context.tenantId`.
- Offline events from old sessions (with stale tenant_id) sync against the currently authenticated tenant.

### Changed: Better error messages in syncWorkBlock
- Internal errors now expose the real PostgreSQL/message instead of generic "Sync operation failed due to an internal error."

### Changed: Smoke runner migrations list
- `database/scripts/run-postgres-smoke.js` now includes migrations 014–019.

### Tests
- 185 tests passing
- Updated tests that previously asserted tenant mismatch rejection to assert new behavior (context tenant wins).

---

## 2026-07-05 - Guías de usuario para Supervisor, Operario y Global Admin

### Added: 3 nuevas guías en help-content.ts
- **Problema:** Solo el panel de admin (modern + classic) tenía guías de usuario (6 guías para pestañas). Los paneles de supervisor, operario y global admin no tenían guía.
- **Solución:** Tres nuevas exports en `help-content.ts`:
  - `SUPERVISOR_HELP` — 6 secciones: presentación, pestaña Órdenes, crear orden con custom fields, pestaña Puestos Andon, activity feed, polling 10s
  - `OPERATOR_HELP` — 6 secciones: presentación, selección de orden, datos de la orden (read-only), botones HMI, registro de producción, nombre real en cabecera
  - `GLOBAL_ADMIN_HELP` — 5 secciones: presentación, crear tenant (subdominio + admin + password), activar módulos, estadísticas por tenant, eliminar tenant
- **Archivos:** `frontend/src/help-content.ts`

### Changed: HelpModal en 6 paneles nuevos
- `SupervisorPanel.tsx` (moderno) — botón Ayuda en header, junto a "+ Nueva Orden"
- `ClassicSupervisorPanel.tsx` — botón Ayuda junto a "+ Nueva Orden"
- `OperatorPanel.tsx` (moderno) — botón Ayuda en header del HMI, junto a "⚙️ Admin"
- `ClassicOperatorPanel.tsx` — botón Ayuda junto a "Fallos: N"
- `GlobalAdminPanel.tsx` (moderno) — botón Ayuda en header, junto a tabs
- `ClassicGlobalAdminPanel.tsx` — botón Ayuda junto a tabs
- **Patrón:** Cada panel clásico usa `theme="classic"` explícitamente

### Tests
- 185 tests passing (sin cambios — feature es puramente UI)
- TypeScript compila limpio

### Resumen estado de guías
| Panel | Tema | Guía | Estado |
|---|---|---|---|
| AdminPanel | Moderno | 6 (Users/Workstations/Models/Orders/Modules/CustomFields) | ✅ previo |
| ClassicAdminPanel | Clásico | 6 (mismas) | ✅ previo |
| SupervisorPanel | Moderno | SUPERVISOR_HELP | ✅ Nuevo |
| ClassicSupervisorPanel | Clásico | SUPERVISOR_HELP | ✅ Nuevo |
| OperatorPanel | Moderno | OPERATOR_HELP | ✅ Nuevo |
| ClassicOperatorPanel | Clásico | OPERATOR_HELP | ✅ Nuevo |
| GlobalAdminPanel | Moderno | GLOBAL_ADMIN_HELP | ✅ Nuevo |
| ClassicGlobalAdminPanel | Clásico | GLOBAL_ADMIN_HELP | ✅ Nuevo |

---

## 2026-07-05 - Supervisor Panel Rewrite + ClassicAdminPanel V2 Users

### Changed: SupervisorPanel + ClassicSupervisorPanel — Tabs, Progress, Andon, Polling
- **Problema:** Supervisor panel solo listaba órdenes sin progreso visible, sin activity feed, sin board Andon.
- **Solución:** Rewrite completo con tabs (Órdenes/Puestos), barras de progreso (`produced_quantity/quantity` %), activity feed expandible por orden (`ActivityFeed.tsx`), workstation board Andon tipo semáforo (`WorkstationBoard.tsx`), polling automático 10s.
- **Paridad:** `ClassicSupervisorPanel.tsx` ahora usa los mismos componentes (`ActivityFeed`, `WorkstationBoard`), mismo polling, mismos tabs que la versión moderna.
- **Archivos:** `SupervisorPanel.tsx`, `ClassicSupervisorPanel.tsx`, `components/ActivityFeed.tsx` (nuevo), `components/WorkstationBoard.tsx` (nuevo)

### Added: Backend endpoints — activity + workstation status
- `GET /orders/:id/activity` — bloques de trabajo con JOIN a users para nombre del operario.
- `GET /orders/workstations-status` — estado Andon por puesto con LATERAL JOIN para última actividad.
- `orders.service.ts` reescrito con `ORDER_FIELDS`/`ORDER_FROM` constantes (JOIN a manufacturing_models + workstations).
- `syncWorkBlock()` en `core-mes-production.service.ts` ahora actualiza `orders.produced_quantity` y `orders.defect_quantity` (junto con `production_orders`).

### Added: Migrations 017 + 018
- **017:** `custom_fields JSONB` en `orders` (N.Orden, Medida, Material, Notas — supervisor writes, operator reads-only).
- **018:** `produced_quantity NUMERIC(12,4)` + `defect_quantity NUMERIC(12,4)` en `orders`.

### Changed: ClassicAdminPanel — UsersTab con campos V2
- **Problema:** `ClassicAdminPanel.tsx` UsersTab solo tenía `username`, `password`, `role`. No había paridad V2.
- **Solución:** UsersTab reescrito con campos V2: `first_name`, `last_name`, `employee_number` (No. Ficha), `operator_category` (peon_especialista/oficial_3/oficial_2/oficial_1), `default_workstation_id` (puesto predeterminado), `is_active` (toggle activo/inactivo). Tabla con 8 columnas (Nombre, Usuario, Ficha, Rol, Categoría, Puesto, Estado, Acciones).
- **Paridad completa** con `AdminPanel.tsx` (moderno) UsersTab.
- **Archivos:** `ClassicAdminPanel.tsx`

### Tests
- 185 tests passing (test de `listOrders` actualizado para reflejar JOINs: mock rows ahora incluyen `model_name`, `workstation_name`, `produced_quantity`, `defect_quantity`, `custom_fields`)
- TypeScript compila limpio (frontend + backend)

---

## 2026-07-05 - Order Selection: Selección de orden por operario

### Added: GET /orders/available (Backend)
- **Problema:** No existía endpoint para listar órdenes disponibles del puesto del operario.
- **Solución:** Endpoint que filtra por `workstation_id` del usuario y status `pending`/`in_progress`, con JOIN a `manufacturing_models` y `workstations` para nombres legibles.
- **Archivos:** `orders.controller.ts`

### Changed: HMI Store — availableOrders + selectOrder
- **Problema:** No había forma de listar o seleccionar órdenes desde el panel del operario.
- **Solución:** `availableOrders: AvailableOrder[]`, `loadAvailableOrders()`, `selectOrder(order)` — al seleccionar setea `orderId`, `workstationId` y `workstationName`.
- **Archivos:** `hmi-store.ts`

### Changed: OperatorPanel + ClassicOperatorPanel — Order selection screen
- **Problema:** El operario entraba directo al panel HMI sin elegir orden.
- **Solución:** Cuando `!orderId`, muestra pantalla de selección con barra de búsqueda (filtro por modelo, puesto, código), lista de órdenes, loading spinner y estado vacío.
- **Archivos:** `OperatorPanel.tsx`, `ClassicOperatorPanel.tsx`

### Tests
- 185 tests passing (sin cambios en tests — cambio es UI + display)
- TypeScript compila limpio

---

## 2026-07-05 - Operator Context: Nombres reales en panel HMI

### Added: GET /production/operator/context (Backend)
- **Problema:** No existía endpoint que devolviera el contexto del operario (puesto y nombre).
- **Solución:** Endpoint que cruza `users` → `workstations` y devuelve `operatorName` (COALESCE first_name+last_name o username) + `workstationName`.
- **Archivos:** `core-mes-production.controller.ts`

### Changed: HMI Store — workstationName + operatorName
- **Problema:** El store solo almacenaba `workstationId` y `operatorId` (UUIDs).
- **Solución:** Nuevos campos `workstationName` y `operatorName` en `HmiState`, inicializados a `null`.
- **Archivos:** `hmi-store.ts`

### Changed: OperatorPanel + ClassicOperatorPanel — nombres legibles
- **Problema:** Panel mostraba UUIDs truncados (`b2f1ef23`) en vez de nombres.
- **Solución:** Renderiza `workstationName || workstationId` con fallback a ID truncado si nombre no disponible.
- **Archivos:** `OperatorPanel.tsx`, `ClassicOperatorPanel.tsx`

### Tests
- 185 tests passing (sin cambios en tests — cambio es UI + display)
- TypeScript compila limpio

---

## 2026-07-05 - Fase 13: Custom Fields Editables por Operarios

### Added: PATCH /production/orders/:id/custom-fields (Backend)
- **Problema:** Los operarios no podían editar custom fields de órdenes de producción.
- **Solución:** Nuevo endpoint con validación Zod `.strict()` contra `custom_fields_schema` del tenant.
- **Archivos:** `core-mes-production.controller.ts`, `core-mes-production.service.ts`, `dto.ts`

### Changed: CustomFieldsSchemaValidator + label support
- **Problema:** El schema de custom fields no tenía campo `label` para nombres legibles.
- **Solución:** Añadido `label: z.string().trim().max(100).optional().default('')` al Zod schema.
- **Archivos:** `tenant-capabilities.service.ts`

### Changed: OperatorPanel + ClassicOperatorPanel (Frontend)
- **Problema:** Los custom fields se mostraban como solo lectura.
- **Solución:** Inputs editables (text/number/boolean) con botón "Guardar Campos" que hace PATCH al backend.
- **Archivos:** `OperatorPanel.tsx`, `ClassicOperatorPanel.tsx`, `hmi-store.ts`

### Changed: Admin Panels — label input
- **Problema:** El admin solo podía definir `key`, `type`, `required` de campos personalizados.
- **Solución:** Añadido campo `label` a tabla de campos personalizados en 4 paneles admin.
- **Archivos:** `AdminPanel.tsx`, `ClassicAdminPanel.tsx`, `TenantAdminPanel.tsx`, `ClassicTenantAdminPanel.tsx`

### Tests
- 185 tests passing (180 + 3 custom-fields-update + 2 label-validation)
- TypeScript compila limpio
- Backend: `custom-fields-validation.spec.ts` expandido con 3 tests nuevos

---

## 2026-07-04 - Fase 11: Global Admin (gestión de clientes)

### Added: GlobalAdminModule (Backend)
- **Problema:** No existía forma de gestionar tenants (clientes) desde el sistema.
- **Solución:** `global-admin/` module con CRUD completo: listTenants, getTenant, getTenantStats, createTenant, updateTenant, deleteTenant, toggleModule.
- **Archivos:** `backend/src/global-admin/global-admin.service.ts`, `global-admin.controller.ts`, `global-admin.module.ts`, `global-admin.spec.ts`

### Added: GlobalAdminPanel + ClassicGlobalAdminPanel (Frontend)
- **Problema:** No existía UI para gestión de clientes.
- **Solución:** Panel dual theme con: lista de tenants (expandible), estadísticas por tenant (users, workstations, orders, blocks), toggle de módulos, crear/editar/eliminar tenants.
- **Ruta:** `/global-admin`
- **Archivos:** `frontend/src/GlobalAdminPanel.tsx`, `frontend/src/ClassicGlobalAdminPanel.tsx`

### Added: API functions (Global Admin)
- **Problema:** No existían funciones frontend para llamar a los endpoints de Global Admin.
- **Solución:** `admin-entities.ts` expandido con `GlobalTenant`, `TenantStats` y funciones CRUD.
- **Archivos:** `frontend/src/api/admin-entities.ts`

### Changed: App.tsx + app.module.ts
- **Problema:** Ruta `/global-admin` no existía.
- **Solución:** `App.tsx` usa `GlobalAdminPanel`/`ClassicGlobalAdminPanel` para `/global-admin`. `app.module.ts` importa `GlobalAdminModule`.

### Tests
- 179 tests passing (178 + 1 new: global-admin.spec.ts)
- TypeScript compila limpio
- Vite build exitoso (65 modules, 442 kB)

---

## 2026-07-04 - Fase 10: Hardening final y portfolio comercial

### Changed: Documentos comerciales
- **Problema:** Documentos comerciales no reflejaban la integración de módulos en UI.
- **Solución:** Actualización de executive summary, case study, one-pager y feature matrix con dashboards frontend y migraciones DB.
- **Archivos:** `docs/commercial/00_executive-summary.md`, `02_portfolio-case-study.md`, `03_sales-one-pager.md`, `04_feature-benefits-matrix.md`

### Changed: Documentación maestra
- **Problema:** ROADMAP.md, KAVANA_RULES.md, technical/10_project-roadmap.md no reflejaban fase completada.
- **Solución:** Actualización a "proyecto listo para producción".
- **Archivos:** `ROADMAP.md`, `KAVANA_RULES.md`, `docs/technical/10_project-roadmap.md`, `docs/decisions-log.md`

### Resumen final del proyecto
- **Backend:** NestJS con 178 tests, 11 endpoints (Users, Workstations, ManufacturingModels, Orders, OEE, Quality, Cost, Auth, TenantCapabilities)
- **Frontend:** React + Tailwind con 8 paneles (Operator, Supervisor, Admin, TenantAdmin — cada uno dual theme) + 3 dashboards (OEE, Quality, Cost)
- **DB:** 14 migraciones (000-013), tablas con RLS e índices
- **Seguridad:** Cross-tenant isolation, state machine, sync integrity
- **Modularidad:** Feature flags JSONB, 3 módulos premium con `@RequireFeature` guard
- **Docs:** 4 ADRs, 11 decisions, technical docs, commercial portfolio

---

## 2026-07-04 - Fase 9: Integración real (módulos premium en UI)

### Added: Migraciones 012-013 (quality_checks + cost_entries)
- **Problema:** Las tablas `quality_checks` y `cost_entries` no existían en la base de datos.
- **Solución:** Migraciones 012 y 013 con RLS, índices y constraints.
- **Archivos:** `database/migrations/012_create_quality_checks.sql`, `013_create_cost_entries.sql`

### Added: API functions (Quality + Cost)
- **Problema:** No existían funciones frontend para llamar a los endpoints de Quality y Cost.
- **Solución:** `admin-entities.ts` expandido con `QualityCheck`, `QualitySummary`, `CostEntry`, `CostSummary` y funciones CRUD.
- **Archivos:** `frontend/src/api/admin-entities.ts`

### Added: QualityDashboard.tsx
- **Problema:** No existía visualización de datos de calidad.
- **Solución:** Dashboard con creación de checks, selección de orden, resumen (pass/fail/conditional), tabla de checks.
- **Archivos:** `frontend/src/components/QualityDashboard.tsx`

### Added: CostDashboard.tsx
- **Problema:** No existía visualización de datos de costes.
- **Solución:** Dashboard con creación de entradas, selección de orden, gráfico de barras por categoría, tabla de entradas.
- **Archivos:** `frontend/src/components/CostDashboard.tsx`

### Changed: AdminPanel + ClassicAdminPanel
- **Problema:** Los módulos OEE, Quality, Cost no estaban integrados en la UI del admin.
- **Solución:** Tabs condicionales basados en feature flags: OEE (`oee_monitoring`), Calidad (`quality_assurance`), Costes (`cost_management`).
- **Archivos:** `frontend/src/AdminPanel.tsx`, `frontend/src/ClassicAdminPanel.tsx`

### Changed: Smoke runner + database README
- **Problema:** Smoke runner no incluía migraciones 011-013.
- **Solución:** `migrationFiles` expandido con 011-013. README actualizado.
- **Archivos:** `database/scripts/run-postgres-smoke.js`, `database/README.md`

### Documentation Loop
- ROADMAP.md, KAVANA_RULES.md, decisions-log.md, technical/10_project-roadmap.md, CONTRIBUTING.md actualizados.

### Tests
- 178 tests passing (sin cambios en backend — todo el trabajo fue frontend + migraciones)
- TypeScript compila limpio
- Vite build exitoso

---

## 2026-07-04 - Fase 8: Portfolio comercial actualizado

### Changed: Documentos comerciales
- **Problema:** Los documentos comerciales mostraban 138 tests y módulos premium como "próximos".
- **Solución:** Actualización completa de 4 documentos con estado real del proyecto (178 tests, 3 módulos funcionales).
- **Archivos:** `docs/commercial/00_executive-summary.md`, `02_portfolio-case-study.md`, `03_sales-one-pager.md`, `04_feature-benefits-matrix.md`

### Changed: Documentación maestra
- **Problema:** ROADMAP.md, KAVANA_RULES.md, technical/10_project-roadmap.md no reflejaban portfolio actualizado.
- **Solución:** Actualización de docs maestros y Documentation Loop.
- **Archivos:** `ROADMAP.md`, `KAVANA_RULES.md`, `docs/technical/10_project-roadmap.md`, `docs/decisions-log.md`

---

## 2026-07-04 - Fase 7: Módulos premium (OEE, Quality, Cost)

### Added: OEE Module (Backend)
- **Problema:** No existía cálculo de OEE (Availability × Performance × Quality) ni endpoints para consultarlo.
- **Solución:** `oee/` module con `OeeService` (cálculos OEE, downtime breakdown) y `OeeController` (3 endpoints protegidos con `@RequireFeature('oee_monitoring')`).
- **Cálculos:** Availability = production time / planned time; Performance = actual rate / target rate; Quality = (total - defects) / total.
- **Archivos:** `backend/src/oee/oee.service.ts`, `oee.controller.ts`, `oee.module.ts`, `oee.spec.ts` (6 tests)

### Added: Quality Module (Backend)
- **Problema:** No existía registro de checks de calidad ni métricas de defectos.
- **Solución:** `quality/` module con `QualityService` (createCheck, listChecks, getSummary) y `QualityController` (3 endpoints protegidos con `@RequireFeature('quality_assurance')`).
- **Archivos:** `backend/src/quality/quality.service.ts`, `quality.controller.ts`, `quality.module.ts`, `quality.spec.ts` (2 tests)

### Added: Cost Module (Backend)
- **Problema:** No existía tracking de costos de producción por categoría.
- **Solución:** `cost/` module con `CostService` (createEntry, listEntries, getSummary) y `CostController` (3 endpoints protegidos con `@RequireFeature('cost_management')`).
- **Archivos:** `backend/src/cost/cost.service.ts`, `cost.controller.ts`, `cost.module.ts`, `cost.spec.ts` (2 tests)

### Added: OEE Dashboard (Frontend)
- **Problema:** No existía visualización de métricas OEE para supervisores.
- **Solución:** `OeeDashboard.tsx` con grid de workstations, colores condicionales por OEE (verde ≥85%, ámbar ≥60%, rojo <60%), detalle por workstation.
- **Archivos:** `frontend/src/components/OeeDashboard.tsx` (nuevo)

### Added: Migration 011 (target_rate)
- **Problema:** `target_rate` estaba referenciado en código backend/frontend pero no tenía migración.
- **Solución:** `011_add_target_rate_to_manufacturing_models.sql` añade columna `target_rate NUMERIC(12,2)` nullable.
- **Archivos:** `database/migrations/011_add_target_rate_to_manufacturing_models.sql` (nuevo)

### Changed: App Module actualizado
- **Problema:** Los módulos OEE, Quality, Cost no estaban registrados en NestJS.
- **Solución:** `app.module.ts` importa `OeeModule`, `QualityModule`, `CostModule`.

### Tests
- 178 tests passing (backend) — 10 nuevos (6 OEE + 2 Quality + 2 Cost)
- TypeScript compila limpio (frontend)
- Vite build exitoso

---

## 2026-07-04 - Fase 6: QA, seguridad y automatización

### Added: Cross-Tenant Leak Tests
- **Problema:** No existían tests que verificaran que cada service filtra por tenant en todas las queries.
- **Solución:** `cross-tenant-isolation.spec.ts` con 15 tests: Users, Workstations, ManufacturingModels, Orders, TenantContext fail-closed. Cada test verifica que la query SQL contiene `get_current_tenant()`.
- **Archivos:** `backend/src/cross-tenant-isolation.spec.ts` (nuevo)

### Added: State Machine Tests
- **Problema:** No existían tests de transiciones de estados de órdenes (pending → in_progress → completed).
- **Solución:** `order-state-machine.spec.ts` con 8 tests: DTO validation (reject pendiente, accept valid statuses) + service-level transitions (workstation required, order not found).
- **Archivos:** `backend/src/order-state-machine.spec.ts` (nuevo)

### Added: Offline Sync Integrity Tests
- **Problema:** No existían tests de validación del DTO de sync offline ni de cross-tenant en sync.
- **Solución:** `sync-integrity.spec.ts` con 9 tests: parada requires downtime_reason, produccion requires produced_quantity, end_time > start_time, tenant_id mismatch, order not found, time overlap.
- **Archivos:** `backend/src/sync-integrity.spec.ts` (nuevo)

### Added: ESLint Config
- **Problema:** No existía configuración ESLint en backend ni frontend (dependency instalada sin config).
- **Solución:** Flat config para ambos workspaces: TypeScript rules, React rules para frontend, react-hooks plugin.
- **Archivos:** `backend/eslint.config.js`, `frontend/eslint.config.js` (nuevos)

### Added: PR Checklist Template
- **Problema:** No existía checklist para Pull Requests, causando revisiones manuales inconsistentes.
- **Solución:** `.github/pull_request_template.md` con checklist de code quality, security, documentation, database.
- **Archivos:** `.github/pull_request_template.md` (nuevo)

### Changed: Smoke Runner actualizado
- **Problema:** Smoke runner solo cubría migraciones 000-005, dejando sin verificar 006-010.
- **Solución:** `run-postgres-smoke.js` ahora aplica migraciones 000-010. README actualizado.
- **Archivos:** `database/scripts/run-postgres-smoke.js`, `database/README.md`

### Tests
- 168 tests passing (backend) — 32 nuevos
- TypeScript compila limpio (frontend)
- Vite build exitoso

---

## 2026-07-04 - Fase 5.6: Global Theme Toggle (Zustand store centralizado)

### Added: Zustand theme store centralizado
- **Problema:** Tema gestionado con `useState` local en App.tsx + `SupervisorPanel.tsx` con localStorage key duplicada (`kavana_theme` vs `kavana_supervisor_theme`). Doble toggle conflicto: ambos cambiaban tema independientemente.
- **Solución:** `store/theme-store.ts` con Zustand. Un solo store, un solo localStorage key (`kavana_theme`), persistencia automática. Eliminada la lógica duplicada de SupervisorPanel.
- **Archivos:** `frontend/src/store/theme-store.ts` (nuevo)

### Added: Componente reutilizable ThemeToggle
- **Problema:** Cada panel tenía su propio toggle inline (App.tsx tenía `ThemeToggle` local, SupervisorPanel tenía `ThemeSwitcher`). No reutilizable, no consistente.
- **Solución:** `components/ThemeToggle.tsx` con dos variantes: `header` (pill compacto inline) y `floating` (botón fijo bottom-right). Importado desde store centralizado.
- **Archivos:** `frontend/src/components/ThemeToggle.tsx` (nuevo)

### Changed: App.tsx simplificado
- **Problema:** App.tsx tenía `useState`, `useEffect`, `getStoredTheme()`, y un `ThemeToggle` inline definido como closure.
- **Solución:** Reemplazado por `useThemeStore` hook. Eliminados 20+ líneas de estado local. ThemeToggle flotante importado desde componente compartido.
- **Archivos:** `frontend/src/App.tsx`

### Changed: SupervisorPanel limpio de conflicto de tema
- **Problema:** SupervisorPanel tenía su propio `useState<'modern' | 'classic'>` con localStorage key separada, causando doble toggle cuando App.tsx ya manejaba el tema.
- **Solución:** Eliminado todo el estado de tema interno. SupervisorPanel ahora solo renderiza la variante moderna (App.tsx se encarga del routing por tema). Eliminado `ThemeSwitcher` inline.
- **Archivos:** `frontend/src/SupervisorPanel.tsx`

### Changed: ThemeToggle añadido a headers de todos los paneles
- **Problema:** Solo existía un toggle flotante (bottom-right). Los usuarios no encontraban fácilmente cómo cambiar de tema.
- **Solución:** ThemeToggle (variante header) añadido al header de cada panel: AdminPanel, ClassicAdminPanel, SupervisorPanel, ClassicSupervisorPanel, OperatorPanel, ClassicOperatorPanel, TenantAdminPanel, ClassicTenantAdminPanel.
- **Archivos:** 8 archivos `.tsx` actualizados

### Tests
- 136 tests passing (backend)
- TypeScript compila limpio (frontend)
- Vite build exitoso

---

## 2026-07-04 - Guías de usuario + Manufacturing Models refactor (unit_of_measure + target_rate)

### Added: Guías de usuario por pestaña del Admin Panel
- **Problema:** Usuarios nuevos necesitaban capacitación técnica para usar el panel de administración.
- **Solución:** Componente reutilizable `HelpModal.tsx` con botón "Ayuda" en cada pestaña. 6 guías completas (Usuarios, Puestos, Modelos, Órdenes, Módulos, Campos Personalizados) con paso a paso.
- **Archivos:** `frontend/src/components/HelpModal.tsx`, `frontend/src/help-content.ts`
- **Temas:** Soporta `theme="modern"` (oscuro) y `theme="classic"` (claro ERP).

### Changed: `estimated_minutes` → `unit_of_measure` + `target_rate` (Manufacturing Models)
- **Problema:** `estimated_minutes` era un campo obligatorio que no debería estar en el paquete base; el cálculo de eficiencia pertenece al módulo OEE.
- **Solución:** Reemplazado por `unit_of_measure` (piezas/h, m/h, kg/h, L/h) y `target_rate` (meta de producción), ambos nullable. Solo visibles cuando el módulo `oee_monitoring` está activo.
- **DB:** Migración `010_replace_estimated_minutes_with_unit.sql` + ALTER TABLE para `target_rate`.
- **Backend:** DTO, Service, y Tests actualizados. `unit_of_measure` y `target_rate` son opcionales.
- **Frontend:** Select condicional + input de meta aparecen solo si OEE activo. Columnas de tabla también se ocultan.
- **Archivos:** `dto.ts`, `manufacturing-models.service.ts`, `admin-entities.ts`, `supervisor.ts`, `AdminPanel.tsx`, `ClassicAdminPanel.tsx`, `SupervisorPanel.tsx`, `ClassicSupervisorPanel.tsx`

### Fixed: Type errors preexistentes en Orders table
- **Problema:** Tabla de Órdenes usaba `quantity_target`, `quantity_produced`, `defect_quantity` y status `stopped` que ya no existen en el tipo `Order`.
- **Solución:** Tabla actualizada a usar `quantity` y status `cancelled`. Columnas reducidas de 6 a 4.

### Tests
- 136 tests passing (backend)
- TypeScript compila limpio (frontend)

---

## 2026-07-04 - Workstations code auto-gen + RolesGuard DI + jsonb_set path fix

### Fixed: Workstations `code` auto-generación
- **Problema:** La columna `code` en `workstations` es NOT NULL pero el servicio no la generaba, causando errores al crear workstations.
- **Solución:** `WorkstationsService.create()` auto-genera `code` con slug del `name`. DTO acepta `code` como opcional.
- **Frontend:** Type `Workstation` actualizado para incluir `code`.

### Fixed: RolesGuard `@Inject(Reflector)` explícito
- **Problema:** `tsx watch` no resolvía `Reflector` en `RolesGuard` usado via `@UseGuards()`.
- **Solución:** Añadido `@Inject(Reflector)` al constructor. Registrado como provider en `TenantCapabilitiesModule`.
- **Lección clave:** Bajo tsx watch, `@Inject()` es obligatorio para TODAS las clases NestJS (guards, middleware, servicios) — no solo controladores.

### Fixed: `jsonb_set` path — `ARRAY[]` en lugar de `||`
- **Problema:** PostgreSQL `||` concatenación produce `text`, no `text[]`. `jsonb_set` requiere `text[]` para el path.
- **Solución:** Cambiado de `'{modular_matrix, ' || $2 || ', enabled}'` a `ARRAY['modular_matrix', $2, 'enabled']`.
- **Lección clave:** Siempre usar `ARRAY[...]` para paths de `jsonb_set`. La concatenación `||` produce tipo incorrecto.

### Archivos modificados
- `backend/src/workstations/workstations.service.ts` — auto-generación de `code`
- `backend/src/workstations/workstations.dto.ts` — `code` opcional
- `frontend/src/api/admin-entities.ts` — `Workstation` type con `code`
- `backend/src/auth/roles.guard.ts` — `@Inject(Reflector)`
- `backend/src/tenant-capabilities/tenant-capabilities.module.ts` — `RolesGuard` provider
- `backend/src/tenant-capabilities/tenant-capabilities.service.ts` — `jsonb_set` path fix

## 2026-07-03 - NestJS DI Fix + Orders Table + Test Mocks (v3.0.0-alpha)

### Fixed: NestJS DI para controladores del admin panel
- **Problema:** `tsx watch` no emite `emitDecoratorMetadata`, causando que NestJS no resuelva dependencias automáticamente.
- **Solución:** Añadido `@Inject(ServiceClass)` explícito en constructors de Users, Workstations, ManufacturingModels y Orders controllers.
- **Alcance:** Todos los controladores nuevos DEBEN usar este patrón.

### Added: Migración 009 — tabla `orders`
- Nueva migración creando tabla `orders` para el CRUD del admin panel.
- Usa `BIGINT tenant_id` (consistente con schema existente).
- UUID primary key, foreign keys a `manufacturing_models` y `workstations` por UUID.

### Fixed: OrdersService.created_by
- Cambiado de `get_current_tenant()` (bigint) a `context.userId` (string) para coincidir con columna TEXT.

### Fixed: Frontend Order type
- Interfaz `Order` en `admin-entities.ts` actualizada para coincidir con columnas reales de la tabla.
- Campo `quantity` único (no `quantity` + `quantity_planned`).
- Status `cancelled` en lugar de `stopped`.

### Updated: Test mocks para 4 servicios
- Todos los specs (users, workstations, manufacturing-models, orders) ahora mockean `../db/postgres.provider.js` y `../db/tenant-query.js` en lugar de pool inyectado por constructor.

### Archivos modificados
- `backend/src/users/users.controller.ts` — @Inject(UsersService)
- `backend/src/workstations/workstations.controller.ts` — @Inject(WorkstationsService)
- `backend/src/manufacturing-models/manufacturing-models.controller.ts` — @Inject(ManufacturingModelsService)
- `backend/src/orders/orders.controller.ts` — @Inject(OrdersService)
- `database/migrations/009_orders.sql` (nuevo)
- `backend/src/orders/orders.service.ts` — created_by fix
- `frontend/src/api/admin-entities.ts` — Order type fix
- `backend/src/users/users.service.spec.ts` — mock update
- `backend/src/workstations/workstations.service.spec.ts` — mock update
- `backend/src/manufacturing-models/manufacturing-models.service.spec.ts` — mock update
- `backend/src/orders/orders.service.spec.ts` — mock update
- `CONTRIBUTING.md` — @Inject() rule added

## 2026-07-03 - Admin Panel CRUD Completo (Fase 5.5)

### Decisión
Reemplazar TenantAdminPanel (solo modules/custom-fields) con AdminPanel que incluye CRUD completo de Users, Workstations, Manufacturing Models, Orders.

### Problema que resuelve
El panel de admin solo mostraba módulos y campos personalizados. Los endpoints CRUD para Users, Workstations y Manufacturing Models existían en el backend pero no tenían interfaz en el frontend.

### Implementación
- `frontend/src/api/admin-entities.ts`: API client con CRUD Users, Workstations, Manufacturing Models, Orders + Capabilities
- `frontend/src/AdminPanel.tsx`: Panel admin moderno con 6 tabs (Usuarios, Puestos, Modelos, Órdenes, Módulos, Campos)
- `frontend/src/ClassicAdminPanel.tsx`: Panel admin clásico ERP con mismas funcionalidades
- `frontend/src/App.tsx`: Actualizado routing `/admin` → AdminPanel/ClassicAdminPanel

### Archivos creados/modificados
- `frontend/src/api/admin-entities.ts` (nuevo)
- `frontend/src/AdminPanel.tsx` (nuevo)
- `frontend/src/ClassicAdminPanel.tsx` (nuevo)
- `frontend/src/App.tsx` (routing actualizado)
- `docs/technical/06_admin-governance-custom-fields.md` (actualizado)

## 2026-07-03 - Documentation Loop Obligatorio

### Decisión
Añadir "Documentation Loop (OBLIGATORIO)" como paso 4 del ciclo TDD en `.clinerules`.

### Problema que resuelve
La documentación no se estaba actualizando en tiempo real con los cambios de código. El metodología (TDD/YAGNI) implicaba documentación pero no la exigía explícitamente.

### Implementación
- `.clinerules` línea 33-40: Documentation Loop como paso 4 del ciclo TDD
- `ai-tdd-portable-kit/.clinerules` línea 77-87: Documentation gate actualizado
- `CONTRIBUTING.md` línea 49-66: Sección Documentation Loop
- 9 skills actualizadas con checklist de Documentation Loop
- `docs/decisions-log.md`: Entrada Documentation Loop Obligatorio
- `docs/DECISIONES_ESTRATEGICAS.md`: Entrada Documentation Loop Obligatorio

### Archivos modificados
- `.clinerules`
- `ai-tdd-portable-kit/.clinerules`
- `CONTRIBUTING.md`
- `root/skills/kavana-v3-documentation-audit-skill.md`
- `root/skills/kavana-v3-architecture-skill.md`
- `root/skills/kavana-v3-qa-security-review-skill.md`
- `root/skills/kavana-v3-modularidad-feature-flags-skill.md`
- `root/skills/kavana-v3-frontend-hmi-offlinefirst-skill.md`
- `root/skills/kavana-v3-backend-auth-rls-skill.md`
- `root/skills/kavana-v3-core-mes-production-skill.md`
- `root/skills/kavana-v3-infra-postgresql-rls-skill.md`
- `root/skills/kavana-v3-admin-jsonb-customfields-skill.md`
- `docs/decisions-log.md`
- `docs/DECISIONES_ESTRATEGICAS.md`
- `docs/audit/changelog.md`

### Lección
"Un cambio sin documentación es un cambio incompleto." La documentación es parte del código, no un adicionado. Las consultoras IT valoran evidencia de proceso profesional, no solo código funcionando.

## 2026-07-03 - Dual Theme System + 138 Tests

### Implementado en el Frontend (Dual Theme System)
- **Sistema de temas dual:** Classic ERP + Moderno Kavana con toggle flotante y persistencia en localStorage.
- **6 componentes UI:** 3 modernos (OperatorPanel, SupervisorPanel, TenantAdminPanel) + 3 clásicos (ClassicOperatorPanel, ClassicSupervisorPanel, ClassicTenantAdminPanel).
- **Theme toggle:** Floating button bottom-right para cambio en tiempo real.
- **Routing dual:** App.tsx selecciona variante según `localStorage.getItem('kavana_theme')`.
- **Fixed pre-existing issues:** ClassicOperatorPanel missing `onClearAll` prop, api/client.ts TypeScript HeadersInit type error.

### Implementado en el Backend (CRUD Completo)
- **Users CRUD:** 21 tests, NestJS module, Zod DTOs, PostgreSQL raw queries.
- **Workstations CRUD:** 19 tests, NestJS module, Zod DTOs, PostgreSQL raw queries.
- **Manufacturing Models CRUD:** 20 tests, NestJS module, Zod DTOs, PostgreSQL raw queries.
- **Orders CRUD:** 20 tests, NestJS module, Zod DTOs, PostgreSQL raw queries, FK references.

### Estado del proyecto
- **Fase 5.4 — COMPLETADA** ✅
- **Vitest:** 138 tests, 0 fallos.
- **Frontend Build:** Exitoso con sistema de temas dual.
- **Próximo hito:** Fase 5.5 - QA automatizado.

### Documentación actualizada
- `docs/technical/05_frontend-hmi-offline-first.md`: Dual theme system documentado.
- `docs/technical/06_admin-governance-custom-fields.md`: ClassicTenantAdminPanel documentado.
- `docs/technical/08_supervisor-panel.md`: Nuevo documento para panel de supervisor.
- `docs/decisions-log.md`: Dual theme + supervisor panel decisions.
- `docs/technical/08_architecture-decisions.md`: ADR-0005 Dual Theme.
- `docs/technical/09_technical-debt.md`: Brechas actualizadas.
- `docs/technical/10_project-roadmap.md`: Fase 5.4 completada.
- `docs/roadmap.md`: Fase 5.4 completada + test inventory.
- `docs/commercial/00_executive-summary.md`: Dual theme como diferencial.
- `docs/commercial/01_product-positioning.md`: Público objetivo actualizado.
- `docs/commercial/02_portfolio-case-study.md`: Dual theme como diferencial único.
- `docs/commercial/03_sales-one-pager.md`: Dual theme en diferenciales.
- `docs/commercial/04_feature-benefits-matrix.md`: Dual theme en matriz.
- `docs/commercial/05_architecture-for-business.md`: Dual theme para negocio.
- `CONTRIBUTING.md`: Convenciones de código dual theme.
- `README.md`: Dual theme como pilar técnico.

## 2026-06-25 - Auditoría `$d` — Cierre Fase 5.4: Custom Fields en Runtime

### Implementado en el Frontend (Custom Fields Dinámicos)
- **Interfaz `ProductionOrder`:** Tipado estricto para la orden activa en el store Zustand, eliminando `any` del estado global.
- **`activeOrder` en Zustand:** El store ahora guarda la orden completa (offline-first). Si la tablet pierde red, la ficha técnica sigue visible.
- **`mapCustomFieldsToUI` (Pure Function):** Creada en `utils/customFieldsMapper.ts`. Cruza los valores de `custom_fields` de la orden con el schema visual del tenant. Fallback resiliente: si un admin borra un campo del schema, la key se capitaliza y el valor se muestra igualmente.
- **Renderizado condicional por tipo:** Booleanos → badge ✓/✗ verde/rojo. Números y textos → tipografía industrial de alto contraste.
- **Selectores Zustand optimizados:** `useHmiStore(s => s.activeOrder?.custom_fields)` para evitar re-renders innecesarios.
- **Tests TDD (4 tests):** Schema coincide, fallback sin schema, schema sin dato, null safety. Todos en verde.

### Estado del proyecto
- **Fase 5.4 — COMPLETADA** ✅
- **Vitest:** 4 suites, 12 tests, 0 fallos.
- **Próximo hito:** Fase 6 según ROADMAP.



### Implementado en el HMI (`OperatorPanel.tsx` & Store)
- **Refactorización de Tiempos a Bloques de Trabajo Retrospectivos:** El HMI ya no funciona por estados dinámicos estandarizados (`start`/`stop`). En su lugar, el operario introduce sus horas de inicio y fin manualmente en un formulario, eliminando fricciones y solapamientos de tiempo.
- **Formateo inteligente HH:MM:** El input de horas autocompleta los `:` para una experiencia UI/UX tipo "vieja escuela" extremadamente rápida.
- **Test en verde:** Todos los tests en `hmi-store.spec.ts` actualizados para la nueva funcionalidad `registerWorkBlock` sobre `offlineBlocks` (Dexie.js IndexedDB), pasando correctamente en verde absoluto bajo filosofía TDD.

### Solucionado en Infraestructura del Agente (Colaboración con RooCode)
- **Terminal restaurada:** Diagnosticado y resuelto el error fatal de `.NET / pwsh.dll`. Se eliminó un Symlink roto de PowerShell 7 en `System32` que forzaba al host `.NET` a resolver en `app_local`. El motor interno Antigravity ahora usa de nuevo el `powershell.exe` clásico v5.1 de Windows de manera exitosa.

### Fase activa
**Fase 5.4 — Custom Fields en Runtime** (Actualizado el estado tras la refactorización HMI).

### Pendiente para cerrar Fase 5.4
- Renderizado dinámico de `custom_fields` de la orden activa en `OperatorPanel.tsx`.
## 2026-06-20 - Auditoría `$d` — Tooling NotebookLM offline-first (Fast Research)

### Implementado en el Tooling (`tools-ai/notebooklm/notebook_bridge.py`)

- **Fast Research por defecto:** Refactorizado el puente CDP para usar Fast Research en NotebookLM por defecto, protegiendo el límite de cuota diario de Deep Research.
- **Modo investigación bajo demanda:** Se añadió el parámetro CLI `--research-mode deep` para usar Deep Research únicamente cuando el contexto arquitectónico lo requiera explícitamente.
- **Manejo robusto de estado UI:** Se añadieron bloques `try/except` robustos en `clean_one_temporary_source`. Los errores de click o elementos no encontrados ahora generan estados (`menu_button_not_found`, `remove_action_not_found`) y marcan el manifiesto como `manual_cleanup_required` en lugar de fallar abruptamente.
- **Sintaxis verificada:** La compilación con `py -3 -m py_compile tools-ai/notebooklm/notebook_bridge.py` validó la sintaxis exitosamente al 100%.

### Fase activa

**Fase 5.4 — Custom Fields en Runtime** (parcialmente completada: ~70%).
*(Ningún avance en la fase del MES desde la auditoría anterior, el trabajo se centró en tooling).*

### Pendiente para cerrar Fase 5.4 (Recordatorio)

- Renderizado dinámico de `custom_fields` de la orden activa en `OperatorPanel.tsx`.
- Modal táctil de TERMINAR con captura de `produced_quantity` y `defect_quantity`.
- Actualización de `produced_quantity` y `defect_quantity` en backend al transicionar a `terminado`.

## 2026-06-17 - Auditoría `$d` — Fase 5.4 en curso (Backend + Admin completados)

### Fase activa

**Fase 5.4 — Custom Fields en Runtime** (parcialmente completada: ~70%).

### Implementado en Fase 5.4

- **Meta-validación Zod del esquema admin:** Validador estático `CustomFieldsSchemaValidator` en [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:132) que exige estructura `{ fields: [{ key, type, required }] }` con regex `^[a-z0-9_]+$` para llaves.
- **Freno de cuota (`max_custom_fields`):** Control en [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:150) que compara `fields.length` contra `resource_quotas.entities.max_custom_fields` y rechaza con `ForbiddenException`.
- **Validación dinámica Zod `.strict()`:** En [`core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:22) el método `createOrder` construye un esquema Zod dinámico desde `customFieldsSchema.production_orders` y aplica `.strict()` para bloquear campos no declarados.
- **Endpoint PATCH custom-fields:** En [`tenant-capabilities.controller.ts`](backend/src/tenant-capabilities/tenant-capabilities.controller.ts) para actualizar `custom_fields_schema` con validación y cuota.
- **Editor visual de campos personalizados:** Componente completo en [`TenantAdminPanel.tsx`](frontend/src/TenantAdminPanel.tsx:234) con sanitización de llaves, selector de tipo, checkbox de obligatoriedad, control de cuota visual y botones táctiles ≥64px.
- **API frontend `updateCustomFieldsSchema`:** En [`admin.ts`](frontend/src/api/admin.ts:50) con `callApiWithTimeout` (4s).
- **Tests de validación:** [`custom-fields-validation.spec.ts`](backend/src/core-mes-production/custom-fields-validation.spec.ts) (3 tests) y [`custom-fields-governance.spec.ts`](backend/src/tenant-capabilities/custom-fields-governance.spec.ts) (3 tests).

### Pendiente para cerrar Fase 5.4

- Renderizado dinámico de `custom_fields` de la orden activa en `OperatorPanel.tsx`.
- Modal táctil de TERMINAR con captura de `produced_quantity` y `defect_quantity`.
- Actualización de `produced_quantity` y `defect_quantity` en backend al transicionar a `terminado`.

### Verificado

- Tests: 21 backend + 5 frontend (26 total), todos en verde.
- Cumplimiento Ponytail: cero dependencias nuevas, cero abstracciones innecesarias.
- Cumplimiento Shield Industrial: `tenant_id` en todas las queries, AbortController 4s, botones ≥64px, IndexedDB para estado crítico.

### Documentación desincronizada corregida en esta auditoría

- `ROADMAP.md`: fase activa decía 5.3, corregida a 5.4.
- `docs/technical/10_project-roadmap.md`: fase activa decía 5.2, corregida a 5.4.
- `docs/technical/06_admin-governance-custom-fields.md`: brechas desactualizadas, corregidas.
- `docs/technical/09_technical-debt.md`: prioridades actualizadas.
- `docs/audit/DECISIONES_ESTRATEGICAS.md`: añadidas decisiones Fase 5.4.
- `README.md`: fecha de auditoría actualizada.

## 2026-06-17 - Saneamiento de Arquitectura HMI (Fase 5.3 consolidada)

### Implementado
- **Timeouts del API y AbortController:** Las llamadas administrativas para `fetchCapabilities` y `toggleModuleCapability` ahora emplean de manera obligatoria el helper `callApiWithTimeout` con un timeout estricto de 4 segundos.
- **Persistencia local de capacidades:** Se actualizó Dexie.js (versión 2) introduciendo la tabla `tenantConfig` para almacenar offline las configuraciones de gobernanza y esquemas dinámicos del tenant.
- **Dynamic Tenant Extraction (JWT parse):** Implementada la decodificación nativa de payloads JWT en el frontend para extraer de forma dinámica `tenantId`, `userId` y `role` sin usar librerías externas.
- **Desacoplamiento de DEMO_TENANT_ID:** Se eliminó la constante hardcodeada `DEMO_TENANT_ID = '1'` de `OperatorPanel.tsx` y se configuró el store de Zustand para inyectar automáticamente el `tenantId` activo.
- **Resolución de bug de proxy de Vite:** Se migró el enrutamiento de capacidades del backend a `/api/tenant/capabilities` para evitar solapamientos con el router del SPA, funcionando ahora el proxy sin problemas.

### Verificado
- Tests en verde: 15 de backend (incluyendo guards, caché L1 y controladores) y 2 de frontend (IndexedDB y FIFO).

## 2026-06-16 - Configuración inicial del entorno local de desarrollo

### Implementado

- Configuración del archivo de variables de entorno `.env` en la carpeta [`backend`](file:///c:/Users/jorge/Desktop/proyectos%20IA/refactorizacion%20kavana%20sistems%20v3/backend) a partir de `.env.example`.
- Creación de un script ejecutable simplificado [`start-dev.bat`](file:///c:/Users/jorge/Desktop/proyectos%20IA/refactorizacion%20kavana%20sistems%20v3/start-dev.bat) en la raíz del proyecto para iniciar concurrentemente los workspaces de backend y frontend con un solo clic.

### Verificado

- Estructura de workspaces y proxies de Vite para la conexión local frontend-backend.

## 2026-06-16 - Fase 5.3 - Panel Tenant Admin

### Implementado

- **Backend RolesGuard:** Nuevo decorador `@RequireRole()` y guard `RolesGuard` en `backend/src/auth` para proteger endpoints exclusivos de `tenant_admin`.
- **Mutación de Capacidades:** Nuevo endpoint `PATCH /tenant/capabilities/modules/:moduleKey` que actualiza `feature_matrix` usando `jsonb_set` en SQL transaccional.
- **Auditoría de Configuración:** El cambio de capacidades se registra automáticamente en la tabla `tenant_config_audit`.
- **Frontend Routing Minimalista:** Se refactorizó `App.tsx` para actuar como router sin dependencias (`window.location.pathname`). El antiguo `App.tsx` pasó a ser `OperatorPanel.tsx`.
- **Panel Tenant Admin:** Nuevo componente UI `TenantAdminPanel.tsx` que lee capacidades y permite conmutar los módulos con un click, incrementando automáticamente `governance_version`.
- **Integración API:** Creado `admin.ts` en el frontend para consumir el backend a través del proxy de Vite.

### Bugs corregidos durante la sesión

- **ESM import de `jsonwebtoken`:** `import { verify }` no funciona en ESM con paquetes CommonJS. Cambiado a `import pkg; const { verify } = pkg;`.
- **NestJS middleware DI:** `JwtServiceWrapper` no se inyectaba en el middleware vía constructor. Simplificado a instanciación directa (`const jwtService = new JwtServiceWrapper()`).
- **Mock-token para dev:** Añadido bypass en `jwt.service.ts` que acepta `Bearer mock-token` y devuelve contexto de `tenant_admin` sin criptografía RSA.

### Bug abierto (bloqueante para validación visual)

- **Vite proxy no enruta `/tenant` al backend.** Vite devuelve el `index.html` del SPA en lugar de hacer proxy a `:3001`. El backend responde correctamente vía `curl` directo. Causa raíz probable: colisión entre SPA fallback y proxy. Solución candidata para próxima sesión: usar prefijo `/api/tenant` o forzar el proxy con `changeOrigin: true` y `rewrite`.

## 2026-06-16 - Fase 5.2 - Backend de capacidades y feature flags

### Implementado

- Módulo global `TenantCapabilitiesModule` en [`backend/src/tenant-capabilities/`](backend/src/tenant-capabilities/tenant-capabilities.module.ts:1).
- Endpoint `GET /tenant/capabilities` para bootstrapping del frontend en [`tenant-capabilities.controller.ts`](backend/src/tenant-capabilities/tenant-capabilities.controller.ts:1).
- Guard global `@RequireFeature('module_key')` registrado como `APP_GUARD` en [`require-feature.guard.ts`](backend/src/tenant-capabilities/require-feature.guard.ts:1).
- Decorador `@RequireFeature()` en [`require-feature.decorator.ts`](backend/src/tenant-capabilities/require-feature.decorator.ts:1).
- Servicio `TenantCapabilitiesService` con lectura de `feature_matrix` y caché L1 en [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:1).
- Caché L1 en memoria con TTL 60s e invalidación por `governance_version` en [`capabilities-cache.ts`](backend/src/tenant-capabilities/capabilities-cache.ts:1).
- `KNOWN_MODULE_KEYS` como set de módulos válidos (fail-safe: desconocidos → `false`).
- Interfaz de capacidades en [`capabilities.interface.ts`](backend/src/tenant-capabilities/capabilities.interface.ts:1).
- `app.module.ts` actualizado para importar `TenantCapabilitiesModule`.

### Verificado

- `npm run build --workspace backend` pasó.
- `npm test --workspace backend` pasó: 15 tests (7 previos + 8 nuevos).

### Decisiones técnicas (Ponytail)

- **Sin Redis:** Caché L1 con `Map` nativo. Upgrade path documentado con `// ponytail:`.
- **Sin nuevo paquete:** Todo resuelto con `pg` y NestJS nativos.
- **Guard como APP_GUARD:** Se ejecuta en todos los handlers pero solo bloquea si `@RequireFeature` está presente. `/health` y rutas sin decorador no se ven afectadas.

## 2026-06-16 - Validación SQL real y resolución del bloqueo sin `psql`

### Implementado

- Runner SQL real con `pg` en [`database/scripts/run-postgres-smoke.js`](database/scripts/run-postgres-smoke.js:1).
- Script raíz `database:smoke` en [`package.json`](package.json:18).
- Documentación de ejecución sin `psql` en [`database/README.md`](database/README.md:47) y [`database/tests/README.md`](database/tests/README.md:1).
- `package.json` configurado como `"type": "module"` para eliminar el warning de Node en el runner.

### Corregido durante la validación real

- `kavana_app` no tenía grants DML sobre `users`; se añadieron grants en [`database/migrations/000_extensions_roles_rls.sql`](database/migrations/000_extensions_roles_rls.sql:20).
- El trigger de auditoría usaba `NEW.tenant_id` en la tabla `tenants`; se corrigió a `NEW.id` en [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:256).
- El smoke test esperaba 3 auditorías cuando el escenario genera 2 cambios; se ajustó en [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:95).

### Verificado

- `npm run database:smoke` pasó contra PostgreSQL 18 en Docker.
- Aplicó migraciones `000..005`.
- Verificó grants de `kavana_app` sobre tablas multi-tenant.
- Ejecutó [`database/tests/001_rls_isolation_smoke.sql`](database/tests/001_rls_isolation_smoke.sql:1).
- Ejecutó [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:1).
- `node --check database/scripts/run-postgres-smoke.js` pasó.
- `npm test` pasó: 7 tests backend y 2 tests frontend.
- `npm run build --workspace backend` pasó.
- `npm run build --workspace frontend` pasó.

### Resultado

El riesgo crítico persistente de no poder verificar migración, smoke test ni grants contra PostgreSQL real queda resuelto. La infraestructura de validación SQL real ahora existe y ya encontró/corrigió fallos reales antes de llegar a producción.

## 2026-06-15 - Resolver bloqueo de validación SQL sin `psql`

### Implementado

- Runner SQL real con `pg` en [`database/scripts/run-postgres-smoke.js`](database/scripts/run-postgres-smoke.js:1).
- Script raíz `database:smoke` en [`package.json`](package.json:17).
- Documentación de ejecución sin `psql` en [`database/README.md`](database/README.md:47) y [`database/tests/README.md`](database/tests/README.md:1).

### Verificado

- `node database/scripts/run-postgres-smoke.js --tests-only --database-url=postgres://postgres:postgres@127.0.0.1:1/kavana_v3_smoke` falla limpiamente por `ECONNREFUSED`, demostrando que ya no depende de Docker cuando se pasa `--database-url`.
- Docker Desktop quedó disponible durante la validación final y permitió ejecutar `npm run database:smoke` contra PostgreSQL 18.

### Pendiente

- Mantener el runner como validación obligatoria antes de futuras migraciones.

## 2026-06-15 - Auditoría `$d` posterior a Fase 5.1

### Revisado

- Reglas globales en [`.clinerules`](.clinerules:1).
- Roadmap maestro [`ROADMAP.md`](ROADMAP.md:1).
- Roadmap técnico [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1).
- Changelog [`docs/audit/changelog.md`](docs/audit/changelog.md:1).
- Deuda técnica [`docs/technical/09_technical-debt.md`](docs/technical/09_technical-debt.md:1).
- Auditoría multi-tenancy [`docs/technical/01_multi-tenancy-rls-audit.md`](docs/technical/01_multi-tenancy-rls-audit.md:1).
- Backend/auth [`docs/technical/02_backend-auth-context.md`](docs/technical/02_backend-auth-context.md:1).
- QA/security [`docs/technical/07_security-qa-audit.md`](docs/technical/07_security-qa-audit.md:1).
- Migración de gobernanza [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:1).

### Hallazgos

- Fase activa correctamente registrada como **Fase 5.2 - Backend de capacidades y feature flags**.
- Fase 5.1 queda documentada como completada en DB, con pendiente ejecución real contra PostgreSQL.
- Documentación multi-tenancy estaba desactualizada y se ha corregido.
- Documentación backend estaba desactualizada y ahora distingue backend mínimo implementado de autenticación JWKS pendiente.
- Documentación QA estaba desactualizada y ahora refleja Fase 5.1.
- Riesgo crítico persistente: no hay `psql` disponible en PATH, por lo que las migraciones y smoke tests SQL no se han ejecutado contra PostgreSQL.

### Actualizado

- [`docs/technical/01_multi-tenancy-rls-audit.md`](docs/technical/01_multi-tenancy-rls-audit.md:1).
- [`docs/technical/02_backend-auth-context.md`](docs/technical/02_backend-auth-context.md:1).
- [`docs/technical/07_security-qa-audit.md`](docs/technical/07_security-qa-audit.md:1).
- [`docs/technical/09_technical-debt.md`](docs/technical/09_technical-debt.md:1).

## 2026-06-15 - Fase 5.1 - Gobernanza de tenant

### Revisado

- Roadmap maestro [`ROADMAP.md`](ROADMAP.md:1).
- Roadmap técnico [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1).
- Diseño de feature flags [`docs/technical/03_feature-flags-modularity.md`](docs/technical/03_feature-flags-modularity.md:1).
- Diseño de gobernanza y custom fields [`docs/technical/06_admin-governance-custom-fields.md`](docs/technical/06_admin-governance-custom-fields.md:1).
- Auditoría de seguridad [`docs/technical/07_security-qa-audit.md`](docs/technical/07_security-qa-audit.md:1).

### Implementado

- Migración de gobernanza [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:1).
- Normalización de `feature_matrix` con semilla `schema_version = 3.1.0`.
- Separación entre `resource_quotas` editables y `hard_limits`.
- `custom_fields_schema JSONB` para validación dinámica futura.
- `governance_version` para invalidación de caché.
- Función helper `tenant_feature_enabled(BIGINT, TEXT)` con fail-safe para módulos desconocidos.
- Auditoría de cambios críticos en `tenant_config_audit`.
- Test manual [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:1).

### Verificado

- `npm run build --workspace backend` pasó.
- `npm run build --workspace frontend` pasó.
- `npm test` pasó: 9 tests en total.
- `psql --version` no está disponible en el PATH, por lo que la migración 005 y el smoke test de gobernanza quedan pendientes de ejecución contra PostgreSQL.
- `git diff --check` no es ejecutable porque el workspace no está inicializado como repositorio Git.

### Actualizado

- [`database/README.md`](database/README.md:17) documenta la migración 005 y tests manuales.
- [`database/tests/README.md`](database/tests/README.md:1) documenta el test de gobernanza.
- [`docs/technical/03_feature-flags-modularity.md`](docs/technical/03_feature-flags-modularity.md:1) refleja Fase 5.1 implementada en DB.
- [`docs/technical/06_admin-governance-custom-fields.md`](docs/technical/06_admin-governance-custom-fields.md:1) refleja Fase 5.1 implementada en DB.
- [`docs/technical/09_technical-debt.md`](docs/technical/09_technical-debt.md:1) actualiza deuda y próximos pasos.
- [`ROADMAP.md`](ROADMAP.md:26) y [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:25) avanzan la fase activa a Fase 5.2.

### Pendiente

- Ejecutar `psql "$DATABASE_URL" -f database/migrations/005_tenant_governance.sql`.
- Ejecutar `psql "$DATABASE_URL" -f database/tests/002_tenant_governance_smoke.sql`.
- Implementar Fase 5.2: endpoint de capacidades, guards backend y caché L1/L2.

## 2026-06-15 - Continuación del roadmap Fase 5

### Revisado

- Roadmap maestro [`ROADMAP.md`](ROADMAP.md:1).
- Roadmap técnico [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1).
- Diseño de feature flags [`docs/technical/03_feature-flags-modularity.md`](docs/technical/03_feature-flags-modularity.md:1).
- Diseño de gobernanza y custom fields [`docs/technical/06_admin-governance-custom-fields.md`](docs/technical/06_admin-governance-custom-fields.md:1).
- Auditoría de seguridad [`docs/technical/07_security-qa-audit.md`](docs/technical/07_security-qa-audit.md:1).

### Actualizado

- [`ROADMAP.md`](ROADMAP.md:1) incorpora el próximo hito inmediato de Fase 5 y el detalle operativo por subfases.
- [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1) incorpora la Fase 5.1 a 5.4 con criterios de salida, riesgos y mitigaciones.
- Se mantiene la regla de avance: no avanzar a QA automatizado hasta cerrar la plataforma de configuración multi-tenant.

### Próximo trabajo definido

1. Backend de capacidades y feature flags.
2. Panel Tenant Admin.
3. Custom fields en runtime.
4. QA, seguridad y automatización.

## 2026-06-15 - Identidad visual corporativa HMI

### Implementado

- Paleta corporativa Kavana en [`frontend/tailwind.config.js`](frontend/tailwind.config.js:1).
- Integración del logo [`logo.png`](logo.png:1) en [`frontend/src/App.tsx`](frontend/src/App.tsx:1).
- Actualización de documentación técnica HMI en [`docs/technical/05_frontend-hmi-offline-first.md`](docs/technical/05_frontend-hmi-offline-first.md:1).
- Actualización de documentación comercial en [`docs/commercial/02_portfolio-case-study.md`](docs/commercial/02_portfolio-case-study.md:1), [`docs/commercial/03_sales-one-pager.md`](docs/commercial/03_sales-one-pager.md:1) y [`docs/commercial/05_architecture-for-business.md`](docs/commercial/05_architecture-for-business.md:1).

## 2026-06-15 - Auditoría Fase 4, tests y sincronización offline

### Revisado

- Roadmap maestro [`ROADMAP.md`](ROADMAP.md:1).
- Roadmap técnico [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1).
- Documento técnico HMI [`docs/technical/05_frontend-hmi-offline-first.md`](docs/technical/05_frontend-hmi-offline-first.md:1).
- Documento de deuda técnica [`docs/technical/09_technical-debt.md`](docs/technical/09_technical-debt.md:1).
- Documentos comerciales base de portfolio y ventas.
- Skills de documentación y arquitectura.

### Implementado

- Frontend HMI mínimo offline-first con React, Tailwind, Zustand y Dexie.
- Cliente API con `AbortController` y timeout de 4s.
- Cola local FIFO `offlineLogs`.
- Dead-letter storage `failedLogs`.
- Botones táctiles mínimos de 64px.
- Estado visual online/offline, pendiente de sincronización y fallos.
- Endpoint backend `POST /production/time-logs/sync`.
- Idempotencia backend por `client_event_id`.
- Validación DTO offline con Zod.
- Refuerzo de máquina de estados para rechazar `stop` desde `pendiente` y modificaciones sobre `terminado`.
- Tests backend de máquina de estados y DTO offline.
- Test frontend de cola IndexedDB FIFO y dead-letter.
- Script SQL manual de aislamiento RLS en [`database/tests/001_rls_isolation_smoke.sql`](database/tests/001_rls_isolation_smoke.sql:1).

### Verificado

- `npm test` pasó: 9 tests en total.
- `npm run build --workspace backend` pasó.
- `npm run build --workspace frontend` pasó.

### Riesgos registrados

| Riesgo | Severidad | Estado |
|---|---:|---|
| HMI usa constantes demo de tenant, orden, puesto y operario | Alta | Pendiente |
| Falta autenticación JWT real en frontend/backend | Crítica | Pendiente |
| Falta ejecución del smoke test RLS contra PostgreSQL real | Crítica | Pendiente |
| Falta Service Worker/PWA shell | Media | Pendiente |
| Falta endpoint administrativo para crear órdenes/puestos reales | Media | Pendiente |

### Deuda técnica actualizada

- La deuda técnica se ha movido a [`docs/technical/09_technical-debt.md`](docs/technical/09_technical-debt.md:1).
- El roadmap maestro marca Fase 4 completada, Fase 5.1 completada y Fase 5.2 como fase actual.

## 2026-06-14

### Añadido

- Roadmap maestro de construcción: [`ROADMAP.md`](ROADMAP.md:1).
- Roadmap técnico alineado: [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1).
- Skill específica para comando `$d`: [`root/skills/kavana-v3-documentation-audit-skill.md`](root/skills/kavana-v3-documentation-audit-skill.md:1).
- Registro de la nueva skill en [`root/skills/README.md`](root/skills/README.md:1).
- Estructura base de documentación técnica bajo [`docs/technical/`](docs/technical/00_architecture-overview.md:1).
- Estructura base de documentación comercial bajo [`docs/commercial/`](docs/commercial/00_executive-summary.md:1).
- Registro inicial de auditoría bajo [`docs/audit/0000-01-01_initial-audit.md`](docs/audit/0000-01-01_initial-audit.md:1).

### Actualizado

- La skill `$d` ahora debe leer y revisar [`ROADMAP.md`](ROADMAP.md:1) en cada auditoría.
- [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1) queda alineado con el roadmap maestro.
- [`ROADMAP.md`](ROADMAP.md:1) incorpora guardrails heredados de la extracción V2.

### Añadido tras análisis de versión anterior

- Documento de lecciones: [`docs/technical/11_lessons-from-v2-extraction.md`](docs/technical/11_lessons-from-v2-extraction.md:1).

### Propósito

El comando `$d` queda preparado para activar documentación, auditoría continua y revisión del roadmap en futuras iteraciones.

## 2026-06-14 - Auditoría inicial

### Revisado

- Reglas globales.
- Blueprint del proyecto.
- Documentos maestros.
- Skills existentes.
- Migración SQL parcial de `production_orders`.

### Resultado

Se ha confirmado que el proyecto está en fase inicial, con arquitectura bien definida pero implementación aún incompleta.
