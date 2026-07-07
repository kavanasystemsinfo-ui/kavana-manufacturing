# Kavana V3 - Core MES de Producción

## Estado del documento

- **Estado:** Unificación completada. `orders` como tabla canónica única. `production_work_blocks` creada con schema completo. Type casting SQL hardening aplicado. 185 tests pass.
- **Última actualización:** 2026-07-07.
- **Fuente maestra:** [05_MASTER_CORE_Modelos_De_Datos_Produccion.md](root/05_MASTER_CORE_Modelos_De_Datos_Produccion.md:1).

## Objetivo

Definir el núcleo MES: puestos de trabajo, órdenes de fabricación y logs de tiempos.

## Entidades core

### `workstations`

Implementada en [`database/migrations/002_workstations.sql`](database/migrations/002_workstations.sql:1).

Campos:

- `tenant_id`.
- `id UUID`.
- `code`.
- `name`.
- `status`.
- `created_at`.
- `updated_at`.

Estado: **Implementada** con 19 tests.

### `production_orders`

Implementada en [`database/migrations/003_production_orders.sql`](database/migrations/003_production_orders.sql:1).

Campos:

- `tenant_id`.
- `id`.
- `code`.
- `target_quantity`.
- `produced_quantity`.
- `defect_quantity`.
- `status`.
- `workstation_id`.
- `custom_fields`.
- `created_at`.
- `updated_at`.

Estado: **Implementada** con 20 tests.

### `manufacturing_models`

Implementada en [`database/migrations/006_manufacturing_models.sql`](database/migrations/006_manufacturing_models.sql:1) + [`database/migrations/010_replace_estimated_minutes_with_unit.sql`](database/migrations/010_replace_estimated_minutes_with_unit.sql:1).

Campos:

- `tenant_id`.
- `id UUID`.
- `name VARCHAR(100)`.
- `unit_of_measure TEXT` (nullable) — piezas/h, m/h, kg/h, L/h. Solo visible con OEE activo.
- `target_rate NUMERIC(12,2)` (nullable) — Meta de producción por hora. Solo visible con OEE activo.
- `created_at`.
- `updated_at`.

Estado: **Implementada** con 18 tests. `estimated_minutes` eliminado, reemplazado por `unit_of_measure` + `target_rate`.

### `production_time_logs`

Diseñada conceptualmente en [05_MASTER_CORE_Modelos_De_Datos_Produccion.md](root/05_MASTER_CORE_Modelos_De_Datos_Produccion.md:79).

Campos mínimos:

- `tenant_id`.
- `id`.
- `order_id`.
- `workstation_id`.
- `operator_id`.
- `event_type`.
- `downtime_reason`.
- `registered_at`.
- `is_offline_event`.
- `client_device_id`.

Estado: no implementada en SQL.

## Máquina de estados

Estados de orden:

- `pendiente`.
- `en_marcha`.
- `pausado`.
- `terminado`.

Reglas:

- No pausar si no está en marcha.
- No reanudar si no está pausado.
- No modificar si está terminado.
- No iniciar dos veces la misma orden.
- Toda transición debe registrar un log lineal.

## Unificación: `orders` como tabla canónica única (2026-07-06)

**Decisión:** `production_orders` fue eliminada. Todo el sistema usa `orders` como fuente de verdad.

**Status canónico:** Inglés (`pending`, `in_progress`, `completed`, `cancelled`). Labels UI en español.

**Migraciones relevantes:**
- 020: Crear `production_work_blocks` (idempotente)
- 021: Añadir `code` a `orders`, `model_id` nullable
- 022: Transferir FK a `orders`, dropear `production_orders`

**Relaciones finales:**
- `production_work_blocks.order_id` → FK → `orders(id)` ON DELETE CASCADE
- `quality_checks.order_id` → FK → `orders(id)` ON DELETE CASCADE
- `cost_entries.order_id` → FK → `orders(id)` ON DELETE CASCADE

**Servicios:**
- `OrdersService`: CRUD canónico para órdenes (supervisor + admin)
- `CoreMesProductionService`: `syncWorkBlock`/`lockOrder` usan `orders` sin mirroring ni auto-repair

## Brechas actuales

- ~~Falta `workstations`~~ → **Resuelto**.
- ~~Falta `production_time_logs`~~ → **Resuelto** (renombrado a `production_work_blocks`).
- ~~Falta trigger de `updated_at`~~ → **Resuelto**.
- ~~Falta servicio backend de transiciones~~ → **Resuelto**.
- ~~Falta idempotencia de eventos offline~~ → **Resuelto** (`client_event_id` + `ON CONFLICT DO NOTHING`).
- ~~Desconexión entre `orders` y `production_orders`~~ → **Resuelto** (mirror + auto-repair + migración 019).

## Operator Context — GET /production/operator/context

**Propósito:** Devolver el contexto del operario logueado (puesto de trabajo y nombre) para que el panel HMI muestre nombres legibles en vez de UUIDs.

**Query SQL:**
```sql
SELECT u.id as operator_id,
       COALESCE(NULLIF(u.first_name || ' ' || u.last_name, ' '), u.username) as operator_name,
       u.default_workstation_id, w.name as workstation_name
FROM users u
LEFT JOIN workstations w ON w.tenant_id = u.tenant_id AND w.id = u.default_workstation_id
WHERE u.tenant_id = $1 AND u.id = $2
```

**Respuesta:**
```json
{
  "operatorId": "uuid",
  "operatorName": "Juan Pérez",
  "workstationId": "uuid",
  "workstationName": "Perfiladora 1"
}
```

**Uso en frontend:** `loadOperatorContext()` en `hmi-store.ts` llama a este endpoint y almacena `workstationName` + `operatorName` para que los paneles HMI los rendericen.

## Order Selection — GET /orders/available

**Propósito:** Devolver las órdenes asignadas al puesto del operario con status `pending` o `in_progress`, para que el operario pueda elegir una antes de entrar al panel HMI.

**Query SQL:**
```sql
SELECT o.id, o.model_id, o.workstation_id, o.quantity, o.status, o.created_by,
       o.created_at, o.updated_at,
       mm.name as model_name,
       w.name as workstation_name
FROM orders o
LEFT JOIN manufacturing_models mm ON mm.tenant_id = o.tenant_id AND mm.id = o.model_id
LEFT JOIN workstations w ON w.tenant_id = o.tenant_id AND w.id = o.workstation_id
WHERE o.tenant_id = $1
  AND o.status IN ('pending', 'in_progress')
  AND o.workstation_id = (
    SELECT u.default_workstation_id
    FROM users u
    WHERE u.tenant_id = $1 AND u.id = $2
  )
ORDER BY o.created_at DESC
```

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "model_id": "uuid",
    "workstation_id": "uuid",
    "quantity": 100,
    "status": "pending",
    "model_name": "Perfil 20x20",
    "workstation_name": "Perfiladora 1",
    "created_at": "2026-07-05T..."
  }
]
```

**Uso en frontend:** `loadAvailableOrders()` en `hmi-store.ts` llama a este endpoint. Cuando `!orderId`, el OperatorPanel muestra pantalla de selección con barra de búsqueda. `selectOrder(order)` setea `orderId` + `workstationId` + `workstationName`.
