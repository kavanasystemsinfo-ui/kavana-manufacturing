# Kavana Manufacturing v3 — Database Schema

> Generado a partir de las migraciones SQL en `database/migrations/`
> Versión: 24 migraciones aplicadas (000 → 027)

---

## Tablas

### tenants (Migración 001)
Tabla raíz del multi-tenant. Cada cliente es un tenant.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `BIGINT PK` | Identificador único del tenant |
| `name` | `TEXT` | Nombre del cliente |
| `subdomain` | `TEXT UNIQUE` | Subdominio para routing (ej: megalux.kavana.app) |
| `status` | `TEXT` | `active`, `suspended`, `trial` |
| `feature_matrix` | `JSONB` | Feature flags del tenant |
| `governance_version` | `INTEGER` | Versión de gobernanza |
| `hard_limits` | `JSONB` | Límites del plan |

**RLS:** No (tabla global de administración)
**Índices:** `idx_tenants_subdomain`, `idx_tenants_feature_matrix_path`, `idx_tenants_governance_version`, `idx_tenants_hard_limits_path`

---

### users (Migración 001, modificada 008, 016)
Usuarios pertenecientes a un tenant.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `UUID PK` | |
| `tenant_id` | `BIGINT FK → tenants` | |
| `username` | `VARCHAR(50)` | |
| `password_hash` | `VARCHAR(255)` | |
| `role` | `TEXT` | `admin`, `supervisor`, `operator` |
| `first_name` | `VARCHAR(100)` | |
| `last_name` | `VARCHAR(100)` | |
| `employee_number` | `INTEGER` | |
| `is_active` | `BOOLEAN` | |

**RLS:** ✅ Por tenant_id
**Índices:** `idx_users_tenant_role`, `idx_users_tenant_active`, `idx_users_tenant_username` (UNIQUE), `idx_users_tenant_email` (UNIQUE), `idx_users_tenant_employee_number` (UNIQUE)

---

### workstations (Migración 002)
Puestos de trabajo / máquinas / líneas de producción.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `UUID PK` | |
| `tenant_id` | `BIGINT FK → tenants` | |
| `name` | `VARCHAR(100)` | |
| `code` | `VARCHAR(50)` | Código interno |
| `status` | `TEXT` | `active`, `inactive` |
| `tooling_id` | `UUID` | Utillaje asignado |

**RLS:** ✅ Por tenant_id
**Índices:** `idx_workstations_tenant_code` (UNIQUE), `idx_workstations_tenant_status`

---

### orders (Migración 009, modificada 017, 018, 021, 022)
Tabla canónica de órdenes de producción (unificada desde migración 022).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `UUID PK` | |
| `tenant_id` | `BIGINT FK → tenants` | |
| `code` | `VARCHAR(50)` | Código de orden |
| `model_id` | `UUID FK → manufacturing_models` | Modelo a fabricar |
| `workstation_id` | `UUID FK → workstations` | Puesto asignado |
| `quantity` | `NUMERIC(12,4)` | Cantidad objetivo |
| `produced_quantity` | `NUMERIC(12,4)` | Producido |
| `defect_quantity` | `NUMERIC(12,4)` | Defectuoso |
| `status` | `TEXT` | `active`, `completed`, `cancelled` |
| `custom_fields` | `JSONB` | Campos personalizados |
| `created_by` | `UUID` | |

**RLS:** ✅ Por tenant_id
**Índices:** `idx_orders_tenant`, `idx_orders_tenant_code` (UNIQUE)

---

### production_work_blocks (Migración 020)
Bloques de trabajo (producción o parada) registrados por operarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `UUID PK` | |
| `tenant_id` | `BIGINT FK → tenants` | |
| `order_id` | `UUID FK → orders` | |
| `workstation_id` | `UUID FK → workstations` | |
| `operator_id` | `UUID FK → users` | |
| `type` | `TEXT` | `produccion` o `parada` |
| `start_time` | `TIMESTAMPTZ` | |
| `end_time` | `TIMESTAMPTZ` | |
| `downtime_reason` | `TEXT` | Motivo de parada |
| `produced_quantity` | `NUMERIC(12,4)` | |
| `defect_quantity` | `NUMERIC(12,4)` | |

**RLS:** ✅ Por tenant_id
**Índices:** `idx_pwb_order (tenant_id, order_id, start_time DESC)`, `idx_pwb_operator (tenant_id, operator_id, start_time DESC)`

---

### oee_metrics (vista/calculada)
OEE se calcula desde `production_work_blocks` en el backend (servicio OEE). No es tabla propia.

---

### quality_checks (Migración 012)
Controles de calidad.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `UUID PK` | |
| `tenant_id` | `BIGINT FK → tenants` | |
| `order_id` | `UUID FK → orders` | |
| `workstation_id` | `UUID FK → workstations` | |
| `defect_type` | `TEXT` | Tipo de defecto |
| `quantity` | `NUMERIC` | Cantidad afectada |
| `result` | `TEXT` | `pass` o `fail` |
| `checked_at` | `TIMESTAMPTZ` | |

**RLS:** ✅ Por tenant_id
**Índices:** `idx_quality_checks_tenant`, `idx_quality_checks_order`, `idx_quality_checks_workstation`, `idx_quality_checks_result`, `idx_quality_checks_checked_at`

---

### cost_entries (Migración 013)
Registro de costes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `UUID PK` | |
| `tenant_id` | `BIGINT FK → tenants` | |
| `order_id` | `UUID FK → orders` | |
| `category` | `TEXT` | |
| `amount` | `NUMERIC` | |
| `description` | `TEXT` | |

**RLS:** ✅ Por tenant_id
**Índices:** `idx_cost_entries_tenant`, `idx_cost_entries_order`, `idx_cost_entries_category`, `idx_cost_entries_created_at`

---

### manufacturing_models (Migración 007, modificada 010, 011, 015)
Modelos de fabricación (productos).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `UUID PK` | |
| `tenant_id` | `BIGINT FK → tenants` | |
| `name` | `VARCHAR(100)` | |
| `unit_of_measure` | `TEXT` | `piezas/h`, `m/h`, `kg/h`, `L/h` |
| `target_rate` | `NUMERIC` | Tasa objetivo |
| `workstation_id` | `UUID FK → workstations` | Puesto por defecto |

**RLS:** ✅ Por tenant_id
**Índices:** `idx_manufacturing_models_tenant`, `idx_manufacturing_models_workstation (tenant_id, workstation_id)`

---

### incidencias (Migración 027)
Incidencias / issues de calidad, seguridad, mantenimiento.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `UUID PK` | |
| `tenant_id` | `BIGINT FK → tenants` | |
| `order_id` | `UUID FK → orders` | |
| `workstation_id` | `UUID FK → workstations` | |
| `title` | `TEXT` | |
| `status` | `TEXT` | `abierta`, `en_curso`, `resuelta` |
| `priority` | `TEXT` | |

**RLS:** ✅ Por tenant_id
**Índices:** `idx_incidencias_tenant`, `idx_incidencias_status (tenant_id, status)`, `idx_incidencias_order`, `idx_incidencias_workstation`

---

### toolings (utillajes)
Gestionada desde el backend (no aparece en migraciones SQL como tabla separada, forma parte del módulo de utillajes).

---

### AI Context Tables (Migración 023)
Tablas para el RAG del AI Advisor.

- `ai_context_documents` — Documentos indexados
- `ai_context_chunks` — Fragmentos de documentos con embeddings

**RLS:** ✅ Por tenant_id

---

## Relaciones clave (ER)

```
tenants (1) ──< (N) users
tenants (1) ──< (N) workstations
tenants (1) ──< (N) orders
tenants (1) ──< (N) manufacturing_models
tenants (1) ──< (N) quality_checks
tenants (1) ──< (N) cost_entries
tenants (1) ──< (N) incidencias
tenants (1) ──< (N) production_work_blocks

orders (1) ──< (N) production_work_blocks
orders (1) ──< (N) quality_checks
orders (1) ──< (N) cost_entries
orders (1) ──< (N) incidencias

workstations (1) ──< (N) production_work_blocks
workstations (1) ──< (N) manufacturing_models
```

## RLS (Row-Level Security)

Todas las tablas de datos tienen:
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. Policy de aislamiento por tenant usando `get_current_tenant()`
3. Las queries usan `tenant_id = get_current_tenant()` (función que lee del contexto JWT)

## Recomendaciones

- ✅ Migraciones idempotentes (IF NOT EXISTS)
- ✅ Índices en todas las foreign keys
- ✅ RLS en todas las tablas de tenant
- ✅ Unique constraints en códigos por tenant
- ✅ JSONB para datos flexibles (custom_fields, feature_matrix)
- ⚠️ No se detectaron consultas N+1 críticas en el código backend
