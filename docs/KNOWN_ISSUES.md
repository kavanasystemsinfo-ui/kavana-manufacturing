# Known Issues & Planned Resolutions — Kavana Manufacturing

> **Para reclutadores técnicos**: este documento enumera limitaciones conocidas del proyecto que un ingeniero senior detectaría al revisar el código. Cada una tiene su explicación de trade-off y el camino de resolución previsto. No están ocultas: son decisiones de fase MVP documentadas.

**Última actualización**: 2026-08-08 (auditoría externa segunda ronda).

---

## 1. FK tenant-aware — orders ↔ production_work_blocks

**Problema**: la FK actual en `production_work_blocks` solo comprueba `order_id → orders(id)`, sin verificar que pertenezcan al mismo tenant. La aplicación sí aplica el filtro `WHERE tenant_id = $1 AND id = $2` en `lockOrder()`, pero la constraint de BD no es completa.

**Riesgo real**: bajo en un sistema single-tenant o con RLS activado correctamente. En multi-tenant con RLS desactivado/omitido, un block podría asociarse a una order de otro tenant.

**Por qué no está corregido aún**:
- Requiere una migration que cree `UNIQUE (tenant_id, id)` en `orders` y reemplace la FK actual por `FOREIGN KEY (tenant_id, order_id) REFERENCES orders(tenant_id, id)`
- Cualquier migration de FK necesita probarse con datos reales y verificar que no rompe queries existentes
- Priorizado para la siguiente iteración de hardening de BD

**Plan**: migration 033 con FK compuesta + test de integridad referencial cross-tenant.

---

## 2. Modelo de roles PostgreSQL — kavana_app conceptual pero no creado

**Problema**: 
- La migration `000_extensions_roles_rls.sql` dice explícitamente "no se crea el rol `kavana_app` porque Supabase no permite crear roles"
- Pero las políticas RLS posteriores referencian `TO kavana_app`
- El `docker-compose.yml` crea un usuario `kavana` que es el usuario inicial de PostgreSQL (tiene privilegios de superusuario/propietario)
- El smoke test intenta verificar grants para `kavana_app`
- El `database/README.md` dice que la migration 000 crea `kavana_app`

**Situación real**: en Supabase/Neon (entorno de producción actual), el backend se conecta con el usuario principal y el aislamiento depende de RLS + `SET LOCAL tenant`. En un PostgreSQL propio, `kavana_app` debería existir como rol de aplicación sin superusuario.

**Riesgo real**: medio. Si RLS está activado y configurado correctamente, la protección funciona incluso con el usuario propietario. Pero un auditor de seguridad señalaría que el usuario de aplicación no debería tener capacidad de `BYPASSRLS`.

**Por qué no está corregido aún**:
- Requiere decidir el target de deployment: ¿Supabase/Neon (donde no se pueden crear roles) o PostgreSQL propio (donde sí)?
- Si es Supabase: eliminar referencias a `kavana_app`, actualizar políticas a `TO authenticated` / `TO public`
- Si es PostgreSQL propio: crear el rol `kavana_app` sin superusuario, grants explícitos, y `docker-compose` que lo cree correctamente

**Plan**: ADR-008 documentando la decisión de target + migration de roles coherente con ese target.

---

## 3. Migración 003 fuera de secuencia — columnas `version` y `device_id`

**Problema**:
- `database/migration-003-offline-conflicts.sql` añade columnas `version` y `device_id` a `production_work_blocks`
- `020_create_production_work_blocks.sql` no crea esas columnas
- El backend (`insertWorkBlock`) sí utiliza `version`
- El smoke test solo verifica migraciones hasta la 022; no cubre la 032

**Riesgo real**: medio. Una instalación limpia (`docker compose up`) no ejecutaría `migration-003` automáticamente (está fuera del prefijo numérico `0XX_`), resultando en error al insertar work blocks.

**Por qué no está corregido aún**:
- `migration-003` tiene un formato de nombre distinto al resto (usa guiones en vez de underscore como separador)
- La secuencia numérica saltó de 022 a 032, dejando un hueco
- El smoke test necesita refactorizarse para ejecutar todas las migraciones del directorio en orden alfabético (no una lista hardcodeada)

**Plan**:
1. Renombrar `migration-003-offline-conflicts.sql` → `033_offline_conflicts_columns.sql`
2. Refactorizar `run-postgres-smoke.js` para leer el directorio y ejecutar todas en orden
3. Verificar que `docker compose up` produce un schema completo

---

## Nota para entrevistas

Si un entrevistador detecta alguno de estos problemas y te pregunta:

> *"He visto que tenéis SQL dinámico en insertWorkBlock."*

**Respuesta preparada**: *"Estaba en la lista de deuda técnica. La corrección ya está aplicada en el commit e083cb1: pasé de interpolación de strings a parámetros $1-$16. Lo detectamos en una auditoría externa del 8 de agosto."*

> *"¿Por qué kavana_app no existe realmente?"*

**Respuesta preparada**: *"El proyecto nació sobre Supabase, que no permite crear roles de aplicación. Las políticas RLS están configuradas para que el aislamiento funcione incluso sin el rol dedicado. Para un despliegue en PostgreSQL propio, el plan es crear kavana_app sin superusuario y con grants explícitos. Está documentado en docs/KNOWN_ISSUES.md."*

> *"¿Por qué el smoke test no cubre todas las migraciones?"*

**Respuesta preparada**: *"El smoke test tiene una lista hardcodeada que no se actualizó al añadir migraciones nuevas. El plan inmediato es que lea el directorio en orden y ejecute todo. Está en el roadmap como P1."*

---

## Estado global del hardening

| Issue | Severidad | Estado | Target |
|---|---|---|---|
| SQL dinámico | P0 | ✅ Corregido | e083cb1 |
| JWT exp + timing | P0 | ✅ Corregido | e083cb1 |
| Mock auth dev default | P0 | ✅ Corregido | e083cb1 |
| FK tenant-aware | P1 | 📋 Documentado | Migration 033 |
| kavana_app real | P1 | 📋 Documentado | ADR-008 |
| Migraciones fuera de secuencia | P1 | 📋 Documentado | Refactor smoke test |
| OEE performance=0.85 | P1 | 📋 Documentado | README |
