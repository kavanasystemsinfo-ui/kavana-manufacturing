# Known Issues & Planned Resolutions — Kavana Manufacturing

> **Para reclutadores técnicos**: este documento enumera limitaciones conocidas del proyecto que un ingeniero senior detectaría al revisar el código. Cada una tiene su explicación de trade-off y el camino de resolución previsto. No están ocultas: son decisiones de fase MVP documentadas.

**Última actualización**: 2026-08-21 (auditoría interna completa: 10 riesgos identificados, 6 corregidos).

---

## 1. ~~FK tenant-aware — orders ↔ production_work_blocks~~ — ✅ CORREGIDO (2026-08-21)

**Resolución**: migration `035_tenant_aware_fk_work_blocks.sql` — `UNIQUE (tenant_id, id)` en `orders` + FK compuesta `FOREIGN KEY (tenant_id, order_id) REFERENCES orders(tenant_id, id) ON DELETE CASCADE`. Verificado con smoke test `004_integrity_hardlimits_smoke.sql` (INSERT cross-tenant bloqueado por FK violation). Commit `07cc922`.

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

## 3. Migración 003 fuera de secuencia — parcialmente resuelto

**Problema**:
- `database/migration-003-offline-conflicts.sql` añade columnas `version` y `device_id` a `production_work_blocks`
- `020_create_production_work_blocks.sql` no crea esas columnas
- El backend (`insertWorkBlock`) sí utiliza `version`
- La secuencia numérica saltó de 022 a 032, dejando un hueco
- Tres ficheros comparten hoy el número 028; el orden real depende del sort() alfabético del smoke script

**Resuelto (2026-08-21)**: `run-postgres-smoke.js` ya lee el directorio y aplica todas las migraciones en orden — verificado desde BD limpia con 000..036.

**Pendiente**: renombrar `migration-003-offline-conflicts.sql` → `033_offline_conflicts_columns.sql` y normalizar los 028 duplicados.

---

## 4. RLS ausente en raw_materials y bom_items — ✅ CORREGIDO (2026-08-21)

La migration 028 creó ambas tablas sin `ENABLE/FORCE ROW LEVEL SECURITY` ni políticas. CRUD completo expuesto en `materials.controller.ts` protegido solo por el filtro de aplicación: costes unitarios, proveedores y BOM quedaban expuestos a cross-tenant data bleeding si una query olvidaba el filtro. Resuelto con migration `034_rls_raw_materials_bom.sql` (mismo patrón fail-closed que orders/pwb) + smoke test `003_materials_rls_smoke.sql`. Commit `e1bd584`.

---

## 5. tenantQuery con scope de sesión — ✅ CORREGIDO (2026-08-21)

`set_config(..., false)` (scope de sesión) puede sobrevivir al `release()` del pool y filtrar el contexto del tenant A a la siguiente query que tome esa conexión. Cambiado a transacción explícita con scope local (`true`), mismo patrón que `withTenantTransaction`.

---

## 6. hard_limits protegidos solo por check post-escritura — ✅ CORREGIDO (2026-08-21)

La inmutabilidad dependía de una comparación JSON antes/después en `tenant-capabilities.service.ts`; cualquier ruta nueva que tocara `tenants` la saltaría. Migration `036_hard_limits_immutable.sql` añade trigger BEFORE UPDATE que rechaza mutaciones salvo para el rol `kavana_admin` (creado también por `run-postgres-smoke.js` en entornos no-Supabase). Verificado con smoke test 004.

---

## 7. Clave de cifrado AI con fallback predecible — ✅ CORREGIDO (2026-08-21)

`ai-config.service.ts` aceptaba derivar la clave de cifrado de `JWT_SECRET` o una constante hardcodeada si faltaba `AI_CONFIG_ENCRYPTION_KEY`. Ahora es fail-closed en producción: lanza error en lugar de cifrar API keys de tenants con una clave predecible.

---

## 8. Lint backend decorativo — ✅ CORREGIDO (2026-08-21)

`eslint.config.js` importaba `typescript-eslint`, que no estaba en devDependencies; el job `lint-backend` tenía `continue-on-error: true`, así que el lint no protegía nada. Dependencias añadidas y flag eliminado: 0 errores, el CI ahora bloquea si aparecen.

---

## 9. Rate limits en memoria (abierto)

El límite de subida de fotos (20/10min por IP) y el del asistente IA (25/día) viven en Maps en memoria: se reinician con cada instancia y no funcionan con más de 1 réplica. Para la demo actual (1 réplica) es suficiente. Si se escala: Redis o rate limit en BD.

---

## 10. Sin PWA/Service Worker (abierto, decisión de producto)

El offline-first del HMI depende de Dexie pero no hay Service Worker: recargar sin red mata la app y no hay sync en background. Feature de producto, no parche de seguridad.

---

## 11. Sin DLQ administrativa para eventos offline rechazados (abierto)

Los eventos offline que violan reglas de negocio van a dead-letter en el frontend sin flujo administrativo de revisión. Requiere decisión de UX: quién revisa los rechazos y desde qué panel.

---

## Nota para entrevistas

Si un entrevistador detecta alguno de estos problemas y te pregunta:

> *"He visto que tenéis SQL dinámico en insertWorkBlock."*

**Respuesta preparada**: *"Estaba en la lista de deuda técnica. La corrección ya está aplicada en el commit e083cb1: pasé de interpolación de strings a parámetros $1-$16. Lo detectamos en una auditoría externa del 8 de agosto."*

> *"¿Por qué kavana_app no existe realmente?"*

**Respuesta preparada**: *"El proyecto nació sobre Supabase, que no permite crear roles de aplicación. Las políticas RLS están configuradas para que el aislamiento funcione incluso sin el rol dedicado. Para un despliegue en PostgreSQL propio, el plan es crear kavana_app sin superusuario y con grants explícitos. Está documentado en docs/KNOWN_ISSUES.md."*

> *"¿Por qué el smoke test no cubre todas las migraciones?"*

**Respuesta preparada**: *"Lo detectamos y lo arreglamos: el smoke script ahora lee el directorio y aplica todo en orden. La auditoría del 21 de agosto lo verificó aplicando las 37 migraciones desde una BD limpia."*

> *"¿Cómo garantizan el aislamiento entre tenants?"*

**Respuesta preparada**: *"En tres capas: RLS fail-closed con FORCE en todas las tablas multi-tenant (auditoría del 21 de agosto: detectamos y corregimos dos tablas que se habían creado sin ella), FKs compuestas con tenant_id para integridad referencial, y set_config con scope local a transacción. Cada capa protege aunque otra falle."*

---

## Estado global del hardening

| Issue | Severidad | Estado | Target |
|---|---|---|---|
| SQL dinámico | P0 | ✅ Corregido | e083cb1 |
| JWT exp + timing | P0 | ✅ Corregido | e083cb1 |
| Mock auth dev default | P0 | ✅ Corregido | e083cb1 |
| RLS raw_materials/bom_items | P0 | ✅ Corregido | e1bd584 (migration 034) |
| FK tenant-aware | P1 | ✅ Corregido | 07cc922 (migration 035) |
| tenantQuery scope sesión | P1 | ✅ Corregido | 07cc922 |
| hard_limits inmutables en BD | P1 | ✅ Corregido | 07cc922 (migration 036) |
| Cifrado AI fail-closed | P1 | ✅ Corregido | 07cc922 |
| Lint backend real | P1 | ✅ Corregido | 07cc922 |
| Rate limits en memoria | P2 | 📋 Documentado | Redis si se escala |
| PWA/Service Worker | P2 | 📋 Documentado | Roadmap producto |
| DLQ administrativa | P2 | 📋 Documentado | Decisión UX |
| kavana_app real | P1 | 📋 Documentado | ADR-008 |
| Migraciones duplicadas/fuera de secuencia | P2 | 📋 Parcial | Renombrar migration-003 y 028s |
| OEE performance=0.85 | P1 | 📋 Documentado | README |
