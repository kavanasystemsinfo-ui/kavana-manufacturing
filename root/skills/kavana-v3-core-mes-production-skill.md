# Skill: Kavana Manufacturing - Core MES, Producción y Máquina de Estados

## Propósito

Usa esta skill para diseñar, revisar o corregir entidades del core MES: puestos de trabajo, órdenes de fabricación, logs de tiempos, estados de producción y eventos táctiles de operario.

## Fuente maestra

- [`05_MASTER_CORE_Modelos_De_Datos_Produccion.md`](root/05_MASTER_CORE_Modelos_De_Datos_Produccion.md)

## Entidades core

1. `workstations`
2. `production_orders`
3. `production_time_logs`

## Reglas críticas

1. **Tenant_id obligatorio**
   - Toda entidad debe tener `tenant_id BIGINT NOT NULL`.
   - Toda PK debe ser `PRIMARY KEY (tenant_id, id)`.
   - Toda FK debe ser compuesta con `tenant_id`.

2. **Workstations**
   - Campos mínimos:
     - `tenant_id`
     - `id UUID`
     - `code`
     - `name`
     - `status`
     - `created_at`
     - `updated_at`
   - Índice único local:
     ```sql
     CREATE UNIQUE INDEX idx_workstations_tenant_code
     ON workstations (tenant_id, UPPER(code));
     ```

3. **Production orders**
   - Campos mínimos:
     - `target_quantity`
     - `produced_quantity`
     - `defect_quantity`
     - `status`
     - `workstation_id`
     - `custom_fields JSONB`
   - Estados permitidos:
     - `pendiente`
     - `en_marcha`
     - `pausado`
     - `terminado`
   - Código de orden único por tenant:
     ```sql
     CREATE UNIQUE INDEX idx_production_orders_tenant_code
     ON production_orders (tenant_id, UPPER(code));
     ```

4. **Production time logs**
   - Campos mínimos:
     - `tenant_id`
     - `order_id`
     - `workstation_id`
     - `operator_id`
     - `event_type`
     - `downtime_reason`
     - `registered_at`
     - `is_offline_event`
     - `client_device_id`
   - Eventos permitidos:
     - `start`
     - `pause`
     - `resume`
     - `stop`
   - Índice recomendado:
     ```sql
     CREATE INDEX idx_time_logs_performance
     ON production_time_logs (tenant_id, order_id, registered_at DESC);
     ```

5. **Máquina de estados**
   - No pausar si no está en marcha.
   - No reanudar si no está pausado.
   - No modificar si está terminado.
   - No iniciar dos veces la misma orden.
   - Toda transición debe registrar un log lineal en `production_time_logs`.

6. **Transaccionalidad**
   - Inyectar `SET LOCAL app.current_tenant_id` dentro de transacción.
   - Validar estado antes de mutar.
   - Registrar evento y actualizar orden en la misma transacción.
   - Rollback ante error.

## Checklist de revisión

- [ ] Todas las entidades tienen `tenant_id`.
- [ ] PK compuestas `(tenant_id, id)`.
- [ ] FK compuestas.
- [ ] Índices únicos locales.
- [ ] RLS activado y forzado.
- [ ] Estados restringidos por CHECK.
- [ ] Máquina de estados validada.
- [ ] Logs lineales generados.
- [ ] Transacción con `SET LOCAL`.
- [ ] `custom_fields` JSONB validado.
- [ ] **Documentation Loop:** Cada cambio de código tiene documentación asociada.

## Documentation Loop (OBLIGATORIO)

**Regla:** Un cambio sin documentación es un cambio incompleto.

Después de cada cambio de código que pase tests, actualizar documentación:
1. `docs/roadmap.md` — Estado de fase y conteo de tests.
2. `docs/decisions-log.md` — Si hubo decisión técnica.
3. `docs/technical/XX_<doc-afectado>.md` — Documento técnico afectado.
4. `docs/audit/changelog.md` — Si es funcionalidad nueva.
5. `docs/commercial/*.md` — Si afecta valor de negocio.

## Resultado esperado

Core MES determinista, auditable, multi-tenant y preparado para cálculo posterior de OEE, costes y calidad.
