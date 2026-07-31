# Kavana Manufacturing - Roadmap Global Gate

## Estado del documento

- **Estado:** Gate operativo para Roo Code.
- **Última actualización:** 2026-07-04.
- **Fase activa:** Fase 5.5 - Guías de usuario + Manufacturing Models refactor (completada).
- **Fuentes maestras:** [`ROADMAP.md`](ROADMAP.md:1) y [`docs/technical/10_project-roadmap.md`](docs/technical/10_project-roadmap.md:1).

## Propósito

Este archivo es el punto de actualización compacto exigido por [` .clinerules`](.clinerules:33) y [`KAVANA_RULES.md`](KAVANA_RULES.md:27). No reemplaza al roadmap maestro; resume el gate de avance para evitar modificar lógica de negocio sin pruebas.

## Regla TDD

Antes de modificar backend, frontend store, API client, cola IndexedDB o cualquier mutación de negocio:

1. Ejecutar contexto con [`python tools-ai/notebooklm/notebook_bridge.py`](tools-ai/notebooklm/notebook_bridge.py:26) si hace falta investigación externa.
2. Consumir [`docs/ai/outputs/reporte_fase_actual.md`](docs/ai/outputs/reporte_fase_actual.md:1).
3. Escribir la spec primero.
4. Verificar rojo controlado.
5. Implementar el cambio mínimo.
6. Verificar verde.
7. Refactorizar solo después de verde.
8. Actualizar este archivo solo cuando la suite relevante esté en verde.

## Fase 5.4 - Custom fields en runtime + Dual Theme

### Estado

**Completada.** Backend, Tenant Admin y sistema de temas dual implementados.

### Criterios de entrada cumplidos

- Backend de capacidades y feature flags.
- Validación dinámica de custom fields con Zod `.strict()`.
- Meta-validación del esquema de custom fields.
- Freno de cuota `max_custom_fields`.
- Tenant Admin para activar módulos y configurar campos personalizados.
- Persistencia local de capacidades en IndexedDB.
- Tests existentes de backend y frontend.
- **Dual Theme:** Classic ERP + Moderno Kavana con toggle flotante.

### Criterios de salida cumplidos

- ~~Renderizado dinámico de custom fields en OperatorPanel~~ → **Resuelto**
- ~~Modal TERMINAR con cantidad producida y scrap~~ → **Pendiente** (YAGNI)
- ~~Backend actualiza `produced_quantity` y `defect_quantity` en transición terminado~~ → **Pendiente** (YAGNI)
- Suite funcional en verde: **138 tests passing**

### Dual Theme - Implementación

| Componente | Moderno | Clásico |
|------------|---------|---------|
| OperatorPanel | `OperatorPanel.tsx` | `ClassicOperatorPanel.tsx` |
| SupervisorPanel | `SupervisorPanel.tsx` | `ClassicSupervisorPanel.tsx` |
| TenantAdminPanel | `TenantAdminPanel.tsx` | `ClassicTenantAdminPanel.tsx` |
| Theme Toggle | `App.tsx` (floating button) | `App.tsx` (floating button) |
| Persistencia | `localStorage` | `localStorage` |

## Inventario de tests funcionales

### Backend (138 tests)

- [`backend/src/core-mes-production/core-mes-production.controller.spec.ts`](backend/src/core-mes-production/core-mes-production.controller.spec.ts:1) — 6 tests
- [`backend/src/core-mes-production/custom-fields-validation.spec.ts`](backend/src/core-mes-production/custom-fields-validation.spec.ts:1) — 3 tests
- [`backend/src/core-mes-production/dto.spec.ts`](backend/src/core-mes-production/dto.spec.ts:1) — 4 tests
- [`backend/src/core-mes-production/state-machine.spec.ts`](backend/src/core-mes-production/state-machine.spec.ts:1) — 2 tests
- [`backend/src/tenant-capabilities/require-feature.guard.spec.ts`](backend/src/tenant-capabilities/require-feature.guard.spec.ts:1) — 3 tests
- [`backend/src/tenant-capabilities/tenant-capabilities.controller.spec.ts`](backend/src/tenant-capabilities/tenant-capabilities.controller.spec.ts:1) — 4 tests
- [`backend/src/tenant-capabilities/tenant-capabilities.spec.ts`](backend/src/tenant-capabilities/tenant-capabilities.spec.ts:1) — 8 tests
- [`backend/src/tenant-capabilities/custom-fields-governance.spec.ts`](backend/src/tenant-capabilities/custom-fields-governance.spec.ts:1) — 3 tests
- [`backend/src/auth/jwt.service.spec.ts`](backend/src/auth/jwt.service.spec.ts:1) — 14 tests
- [`backend/src/auth/roles.guard.spec.ts`](backend/src/auth/roles.guard.spec.ts:1) — 6 tests
- [`backend/src/auth/tenant-context.middleware.spec.ts`](backend/src/auth/tenant-context.middleware.spec.ts:1) — 5 tests
- [`backend/src/users/users.spec.ts`](backend/src/users/users.spec.ts:1) — 21 tests
- [`backend/src/workstations/workstations.spec.ts`](backend/src/workstations/workstations.spec.ts:1) — 19 tests
- [`backend/src/manufacturing-models/manufacturing-models.spec.ts`](backend/src/manufacturing-models/manufacturing-models.spec.ts:1) — 20 tests
- [`backend/src/orders/orders.spec.ts`](backend/src/orders/orders.spec.ts:1) — 20 tests

### Frontend (Build exitoso)

- [`frontend/src/api/client.spec.ts`](frontend/src/api/client.spec.ts:1)
- [`frontend/src/db/local-db.spec.ts`](frontend/src/db/local-db.spec.ts:1)
- [`frontend/src/store/hmi-store.spec.ts`](frontend/src/store/hmi-store.spec.ts:1)
- **Dual Theme:** Build exitoso con todos los componentes clásicos y modernos

## Validación actual

- `py -3 -m py_compile tools-ai\notebooklm\notebook_bridge.py`: pasó.
- `npm test --workspaces --if-present`: pasó con **138 tests** funcionales en verde.
- `npm run build` (frontend): **Build exitoso** con sistema de temas dual.

## Avance

| Fase | Estado | Gate |
|---|---|---|
| 5.1 - Gobernanza de tenant | Completada | Verde documental y migración existente |
| 5.2 - Capacidades y feature flags | Completada | Backend y tests existentes |
| 5.3 - Tenant Admin | Completada | Admin panel implementado |
| 5.4 - Custom fields en runtime + Dual Theme | **Completada** | 138 tests + Build exitoso |
| 5.5 - QA automatizado | **En progreso** | NestJS DI fix + Orders table + Test mocks |

### Fase 5.5 — Detalle de cambios (2026-07-03)

- NestJS DI fix: `@Inject()` en 4 controladores para tsx watch
- Migración 009: tabla `orders` para admin panel CRUD
- OrdersService: `created_by` usa `context.userId` (string)
- Frontend Order type: interfaz alineada con schema real
- Test mocks: 4 specs actualizados para mock pattern directo
- CONTRIBUTING.md: regla `@Inject()` añadida

## Próximo bloque permitido

Avanzar a Fase 5.5 - QA automatizado:

1. Implementar tests E2E con Playwright/Cypress
2. Añadir tests de integración frontend-backend
3. Configurar CI/CD pipeline
4. Añadir métricas de cobertura
5. Actualizar este roadmap solo si la suite queda verde.
