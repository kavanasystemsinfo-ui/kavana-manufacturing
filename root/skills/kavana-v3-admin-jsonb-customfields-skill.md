# Skill: Kavana V3 - Admin, Gobernanza JSONB y Custom Fields

## Propósito

Usa esta skill para diseñar o revisar paneles de administración, configuración de inquilinos, validación dinámica de campos personalizados, límites de recursos y gobernanza JSONB.

## Fuente maestra

- [`07_MASTER_ADMIN_Gobernanza_JSONB_y_CustomFields.md`](root/07_MASTER_ADMIN_Gobernanza_JSONB_y_CustomFields.md)

## Principios

1. **Extensibilidad sin DDL**
   - Usar `custom_fields` JSONB para variables del sector.
   - Mantener métricas universales en columnas rígidas:
     - `target_quantity`
     - `produced_quantity`
     - `defect_quantity`
     - `status`

2. **Esquema dinámico**
   - Guardar reglas en:
     ```json
     "custom_fields_schema": {
       "production_orders": {
         "fields": [
           {
             "key": "grosor_mm",
             "label": "Grosor del Material (mm)",
             "type": "number",
             "required": true,
             "min": 0.1,
             "max": 50.0
           }
         ]
       }
     }
     ```

3. **Validación backend**
   - Validar `custom_fields` contra esquema dinámico.
   - Usar Zod/Ajv u otro validador runtime.
   - Rechazar campos no declarados con validación estricta.
   - Respetar límites de `resource_quotas.entities.max_custom_fields`.

4. **Frontend HMI**
   - El HMI debe recibir el esquema al arranque.
   - Evitar UI flashing.
   - Inputs dinámicos deben cumplir mínimo 64px.
   - Formularios deben ser simples, táctiles y orientados a 1-2 clics.

5. **Gobernanza**
   - No permitir que Tenant Admin altere límites duros del sistema.
   - Separar configuración de planta de configuración comercial/global.
   - Registrar auditoría en cambios críticos.

## Checklist de revisión

- [ ] `custom_fields` está en JSONB.
- [ ] Esquema dinámico está en `feature_matrix.custom_fields_schema`.
- [ ] Backend valida tipos, required, min/max/pattern.
- [ ] Validación estricta evita campos desconocidos.
- [ ] Límites de cuotas se respetan.
- [ ] Frontend evita flicker.
- [ ] Controles táctiles mínimos 64px.
- [ ] Cambios críticos tienen auditoría.
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

Administración flexible y segura para tenants, con campos personalizados validados y sin romper el esquema físico.
