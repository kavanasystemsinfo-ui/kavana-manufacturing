# Skill: Kavana Manufacturing - Infra PostgreSQL, Multi-Tenancy y RLS

## Propósito

Usa esta skill para diseñar, revisar o corregir migraciones SQL, modelos de datos, índices, políticas RLS y configuración de PostgreSQL 16 para Kavana Manufacturing.

## Fuente maestra

- [`01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md`](root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md)

## Reglas críticas

1. **Shared-schema multi-tenant**
   - Usar esquema compartido con `tenant_id` como columna de aislamiento.
   - `tenant_id` debe ser `BIGINT`.
   - Todas las tablas transaccionales deben tener `tenant_id BIGINT NOT NULL`.
   - Evitar bases de datos o esquemas separados por inquilino.

2. **Claves primarias e índices**
   - Toda entidad multi-tenant debe usar `PRIMARY KEY (tenant_id, id)`.
   - Todo índice compuesto debe empezar por `tenant_id`.
   - Toda unicidad debe ser local por inquilino:
     ```sql
     CREATE UNIQUE INDEX idx_entity_tenant_code
     ON entity (tenant_id, UPPER(code));
     ```

3. **RLS Fail-Closed**
   - Activar RLS:
     ```sql
     ALTER TABLE entity ENABLE ROW LEVEL SECURITY;
     ALTER TABLE entity FORCE ROW LEVEL SECURITY;
     ```
   - Política segura:
     ```sql
     CREATE POLICY entity_tenant_isolation ON entity
     FOR ALL TO kavana_app
     USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::bigint))
     WITH CHECK (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::bigint));
     ```
   - Si `app.current_tenant_id` está ausente o vacío, la política no debe devolver datos.

4. **GUC de sesión**
   - Usar `current_setting('app.current_tenant_id', true)`.
   - En backend con PgBouncer Transaction Pooling, inyectar con `SET LOCAL` dentro de `BEGIN/COMMIT`.
   - Prohibido `SET SESSION` en Transaction Pooling.

5. **Integridad referencial**
   - Las claves foráneas deben incluir `tenant_id`.
   - Las restricciones `UNIQUE` deben incluir `tenant_id`.
   - Evitar índices únicos globales que filtren existencia de datos entre inquilinos.

6. **Rendimiento con RLS**
   - Usar patrón InitPlan en políticas:
     ```sql
     USING (tenant_id = (SELECT get_current_tenant()))
     ```
   - Considerar índices de cobertura:
     ```sql
     CREATE INDEX idx_entity_tenant_id_cover
     ON entity (tenant_id, id)
     INCLUDE (payload);
     ```

## Checklist de revisión SQL

- [ ] `tenant_id` existe y es `BIGINT NOT NULL`.
- [ ] `PRIMARY KEY (tenant_id, id)`.
- [ ] Índices compuestos empiezan por `tenant_id`.
- [ ] Restricciones `UNIQUE` incluyen `tenant_id`.
- [ ] FK compuestas incluyen `tenant_id`.
- [ ] `ENABLE ROW LEVEL SECURITY`.
- [ ] `FORCE ROW LEVEL SECURITY`.
- [ ] Política `USING` y `WITH CHECK`.
- [ ] Política Fail-Closed si no hay tenant.
- [ ] No hay `SET SESSION`.
- [ ] No hay índices únicos globales.
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

SQL y recomendaciones de infraestructura que garanticen aislamiento hermético, rendimiento escalable y cero riesgo de Data Bleeding.
