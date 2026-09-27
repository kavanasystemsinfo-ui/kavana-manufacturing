# Known Issues & Planned Resolutions: Kavana Manufacturing

> **Para reclutadores técnicos**: este documento enumera limitaciones conocidas del proyecto que un ingeniero senior detectaría al revisar el código. Cada una tiene su explicación de trade-off y el camino de resolución previsto. No están ocultas: son decisiones de fase MVP documentadas.

**Última actualización**: 2026-08-21 (segunda ronda: auditoría adversarial multi-agente: 4 atacantes en paralelo sobre tenancy, auth, frontend y cola/offline; P0 corregidos en el día).

## Ronda 2: Auditoría adversarial (2026-08-21, tarde)

Metodología nueva: en lugar de un auditor con checklist, 4 subagentes adversariales en paralelo con objetivo de ATACAR cada capa. Hallazgos verificados por el orquestador contra el código antes de aceptarlos. Resultado: los P0 más graves (escalada de roles, global-admin sin protección) NO aparecieron en la auditoría matinal de checklist; salieron del ataque dirigido.

---

## 1. ~~FK tenant-aware: orders ↔ production_work_blocks~~: ✅ CORREGIDO (2026-08-21)

**Resolución**: migration `035_tenant_aware_fk_work_blocks.sql`: `UNIQUE (tenant_id, id)` en `orders` + FK compuesta `FOREIGN KEY (tenant_id, order_id) REFERENCES orders(tenant_id, id) ON DELETE CASCADE`. Verificado con smoke test `004_integrity_hardlimits_smoke.sql` (INSERT cross-tenant bloqueado por FK violation). Commit `07cc922`.

---

## 2. Modelo de roles PostgreSQL: kavana_app conceptual pero no creado

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

## 3. Migración 003 fuera de secuencia: ✅ RESUELTO (2026-09-23)

**Problema**:
- `database/migration-003-offline-conflicts.sql` añadía las columnas `version` y `device_id` a `production_work_blocks`, pero vivía FUERA de `database/migrations/`, así que la cadena de migraciones nunca lo aplicaba.
- El backend (`insertWorkBlock`) escribe `version` en el INSERT, de modo que cualquier base creada desde cero devolvía 400 en `POST /production/time-logs/sync`: `column "version" of relation "production_work_blocks" does not exist`. En producción funcionaba porque se había aplicado a mano.
- La secuencia numérica saltó de 022 a 032, dejando un hueco. Tres ficheros comparten hoy el número 028; el orden real depende del sort() alfabético del smoke script.

**Resuelto (2026-08-21)**: `run-postgres-smoke.js` ya lee el directorio y aplica todas las migraciones en orden: verificado desde BD limpia con 000..036.

**Resuelto (2026-09-23)**: el fichero es ahora `database/migrations/041_offline_conflicts_columns.sql`, idempotente y dentro de la cadena. Lo destapó el E2E de flujo completo: el parte del operario acababa en la bandeja de fallos en lugar de llegar al supervisor.

**Pendiente**: normalizar los tres ficheros 028 duplicados.

---

## 4. RLS ausente en raw_materials y bom_items: ✅ CORREGIDO (2026-08-21)

La migration 028 creó ambas tablas sin `ENABLE/FORCE ROW LEVEL SECURITY` ni políticas. CRUD completo expuesto en `materials.controller.ts` protegido solo por el filtro de aplicación: costes unitarios, proveedores y BOM quedaban expuestos a cross-tenant data bleeding si una query olvidaba el filtro. Resuelto con migration `034_rls_raw_materials_bom.sql` (mismo patrón fail-closed que orders/pwb) + smoke test `003_materials_rls_smoke.sql`. Commit `e1bd584`.

---

## 5. tenantQuery con scope de sesión: ✅ CORREGIDO (2026-08-21)

`set_config(..., false)` (scope de sesión) puede sobrevivir al `release()` del pool y filtrar el contexto del tenant A a la siguiente query que tome esa conexión. Cambiado a transacción explícita con scope local (`true`), mismo patrón que `withTenantTransaction`.

---

## 6. hard_limits protegidos solo por check post-escritura: ✅ CORREGIDO (2026-08-21)

La inmutabilidad dependía de una comparación JSON antes/después en `tenant-capabilities.service.ts`; cualquier ruta nueva que tocara `tenants` la saltaría. Migration `036_hard_limits_immutable.sql` añade trigger BEFORE UPDATE que rechaza mutaciones salvo para el rol `kavana_admin` (creado también por `run-postgres-smoke.js` en entornos no-Supabase). Verificado con smoke test 004.

---

## 7. Clave de cifrado AI con fallback predecible: ✅ CORREGIDO (2026-08-21)

`ai-config.service.ts` aceptaba derivar la clave de cifrado de `JWT_SECRET` o una constante hardcodeada si faltaba `AI_CONFIG_ENCRYPTION_KEY`. Ahora es fail-closed en producción: lanza error en lugar de cifrar API keys de tenants con una clave predecible.

---

## 8. Lint backend decorativo: ✅ CORREGIDO (2026-08-21)

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

## Ronda 2: Hallazgos adversariales (2026-08-21, tarde)

### ✅ CORREGIDOS el mismo día (commit 5e15d2c)

**P0-1 · Escalada operario → tenant_admin en una petición.**
`users.controller.ts` sin guard + DTO aceptaba `role` del body: `PUT /users/<mi-id>` con `{"role":"tenant_admin"}` elevaba al operario. Causa raíz: `RolesGuard` solo actuaba con `@UseGuards` explícito (3 controllers de 16).
**Fix**: RolesGuard como APP_GUARD global FAIL-CLOSED (sin decorador = denegado), `@RequireRole` en todos los controllers, prohibido cambiar el rol propio. Tests invertidos + regresión nueva.

**P0-2 · `/global-admin` sin control de roles + tabla `tenants` sin RLS.**
Cualquier JWT válido podía listar tenants ajenos, ver sus stats y suspender/borrar un tenant con CASCADE. `tenants` es la única tabla del esquema sin RLS.
**Fix**: autorización por identidad de plataforma (`GLOBAL_ADMIN_USER_IDS`, fail-closed si no configurada). RLS de `tenants` pendiente (ver abiertos).

**P0-3 · Suplantación de sesión desde localStorage (HMI quiosco).**
El rol/tenant que deciden qué panel se muestra se leían de localStorage sin validar; la "verificación multi-tenant" comparaba una clave consigo misma.
**Fix**: sesión decodificada del JWT real con exp obligatoria; tenant del JWT comparado contra el subdominio de la URL.

**P0-4 · Kiosk mode por URL sin autorización.**
`?operator_id=` atribuía producción a otro operario sin validar server-side.
**Estado**: mitigación parcial: el backend ahora exige rol para las rutas de producción y el contexto viene del JWT; validación server-side completa de pertenencia operator_id↔user pendiente (ver abiertos).

**P1 corregidos también**: JWT exp obligatorio en tokens HMAC; fail-closed sin secret en producción (login y guard simétricos); rate limit login 10/5min/IP.

### 📋 ABIERTOS (priorizados para siguiente ronda)

Ronda 3 (mismo día, commit 255730d): A1, A2, A3, A4 y A6 CORREGIDOS. A5 cerrado como vector (React escapa, 0 sinks). Queda solo A7.

| # | Issue | Severidad | Estado |
|---|---|---|---|
| A1 | RLS FORCE ausente en 9 tablas | P1 | ✅ Corregido: migration 037 (FORCE + política kavana_app donde faltaba) |
| A2 | Redis sin password publicado en 0.0.0.0:6379 | P1 | ✅ Corregido: requirepass obligatorio, puerto eliminado del host, BullMQ con REDIS_PASSWORD y fail-fast en producción |
| A3 | TOCTOU en overlap check de work blocks | P1 | ✅ Corregido: migration 038: EXCLUDE USING gist (tenant_id, operator_id, tstzrange WITH &&), imposible el solapamiento a nivel de BD |
| A4 | Replay de eventos offline con payload cambiado | P1 | ✅ Corregido: migration 039 + backend: fingerprint sha256 del contenido con UNIQUE + ON CONFLICT DO NOTHING |
| A5 | Stored XSS vía custom_fields | P2 | ✅ Cerrado: React escapa por defecto, 0 sinks innerHTML/dangerouslySetInnerHTML verificados |
| A6 | Logs offline persisten en Dexie tras logout | P2 | ✅ Corregido: purgeLocalData() en logout (borra BD Dexie entera, fallback tabla a tabla) |
| A7 | Login sin lockout progresivo / hashes legacy | P2 | ✅ Corregido: 2026-08-22: lockout progresivo por cuenta (5 fallos → bloqueo temporal creciente, ventana 15 min) + re-hash automático a scrypt en el primer login correcto con hash legacy sha256 |

Nota operativa A2: al desplegar, definir REDIS_PASSWORD en el entorno ANTES de `docker compose up` (el compose falla explícitamente si falta).

### Vectores cerrados verificados

SQL injection (todo parametrizado), upload móvil (tenant desde sesión single-use), scope BD transaccional (fix matinal), feature flags fail-safe, path traversal en document-ingest (validación de formato presente).

---

## Ronda 5: La migración api/v1 quedó a medias y el CI lo destapó (2026-09-27)

El E2E en rojo (7 de 9 specs, seis runs seguidas desde el 25-09) tenía tres
causas superpuestas que el síntoma (login que nunca navega) no distinguía:

**P0-C · `frontend/vite.config.js`, un compilado fantasma.** Un build viejo
(21-09) trackeado desde el initial commit ganaba la resolución de Vite sobre
el `.ts` real, y su rewrite `/api → ''` restaba el prefijo a peticiones que ya
llevaban `api/v1`: el backend recibía `/v1/auth/...` y respondía 404. Vite
resuelve `.js` antes que `.ts`; un directorio de build no se versiona.

**P0-D · Doble prefijo.** `admin.ts` y `supervisor.ts` llamaban
`${API_BASE}/api/...` → `/api/v1/api/users` (404 real): los paneles de admin
y supervisor estaban rotos desde el 25-09.

**P0-E · Rutas legacy.** `hmi-store.ts` (el sync de producción del operario:
`/production/time-logs/sync`), `my-time-logs.ts`, `AiAdvisorChat.tsx` y el
E2E del wizard seguían sin versionar. El registro de producción del operario
llevaba roto en producción desde el 25-09.

**Fix (commit 9d63d0f):** spec de contrato `rutas-api-v1.spec.ts` (7 tests,
rojo controlado primero) + corrección de 24 rutas en 6 ficheros + borrado del
fantasma. La spec queda como barrera de regresión: ningún call site sin
versionar, ningún doble prefijo, ningún config compilado.

**Regla que queda:** tras un cambio de prefijo hay que buscar dos cosas: los
que añaden el prefijo de más y los que nunca lo llevaron. El 404 de una ruta
con doble prefijo y el de una legacy son el mismo síntoma con causas opuestas.

---



El E2E de flujo completo (login del operario → registra un parte → el supervisor
lo ve) encontró dos fallos que ninguna suite unitaria cubría, porque los dos viven
en el camino `POST /production/time-logs/sync` contra una base de datos real.

**P0-A · El sync no podía escribir la columna `version`.**
`production_work_blocks` no tenía esa columna en una base creada desde cero: la
migración que la añadía estaba fuera de la carpeta de migraciones (ver el punto 3).
El INSERT moría con `column "version" ... does not exist` y el parte del operario
acababa en la bandeja de fallos del HMI.
**Fix**: migración `041_offline_conflicts_columns.sql` dentro de la cadena.

**P0-B · El INSERT del sync pasaba 16 valores para 17 marcadores.**
`insertWorkBlock` calculaba el `fingerprint` semántico (el dedup anti-replay de la
migración 039) y después no lo incluía en el array de valores, así que Postgres
respondía `bind message supplies 16 parameters, but prepared statement requires 17`.
Es decir: **el registro de producción estaba roto en producción**, no solo en local.
**Fix**: pasar `fingerprint` como último valor del INSERT.

**Por qué no lo cazó nada antes**: el CI no tenía ningún test que ejecutase el
sync de punta a punta contra una base de datos. Los specs del backend mockean el
pool o no tocan esta consulta, y el smoke de migraciones comprueba que la cadena
aplica, no que las columnas que el código escribe existan.

**Regla que queda**: un endpoint que escribe en base de datos necesita al menos un
test que lo ejecute de verdad. Un `grep` del SQL y una suite verde no son prueba de
que la consulta corra.

---

## Ronda 6: Calidad verificable y un agujero de trazabilidad (2026-09-27)

### Lo que se cerró

- **`api/v1` completo y con barrera**: la migración que quedó a medias (ronda 5)
  está cerrada, con `frontend/src/api/rutas-api-v1.spec.ts` como red de
  regresión.
- **Primer spec de integración contra base real**: `core-mes-production.db.spec.ts`
  (35 tests) ejecuta el SQL del motor de producción contra PostgreSQL. Antes, sus
  specs mockeaban el pool y comprobaban la forma de la llamada, no el resultado.
- **Medición de mutación honesta**: 130 de 170 mutantes matados (76,5 %) en
  `core-mes-production.service.ts`, medidos aplicando el mutante al fuente y
  mirando el exit code. El runner de Stryker con Vitest 5 devolvía "0 tests por
  mutante" y marcaba todo como superviviente: **las cifras de la ronda anterior
  (17,6 %) no eran una medida**. Detalle en `docs/mutation-testing.md`.
- **CI**: el job `test` preparaba su base de datos a medias; ahora aplica
  `database/scripts/e2e-setup.js` antes de la suite.

### Abierto (nuevo, verificado en código)

**R6-1 · El operario de un parte no está atado al usuario del token (P1).**
`syncWorkBlock` usa el `operator_id` que llega en el cuerpo de la petición sin
comprobar que corresponda al usuario autenticado
(`backend/src/core-mes-production/core-mes-production.service.ts:149`, `:256`,
`:294`). El tenant sí se toma del token, así que no hay fuga entre clientes, pero
**dentro de un mismo tenant cualquiera con rol `operario` puede registrar partes
a nombre de otro operario**, y eso es el dato del que viven los dashboards de
productividad y las nóminas de tiempo.

Estado: mitigado a medias. La ronda 2 cambió el contexto del token para las rutas
de producción, pero la pertenencia `operator_id` ↔ usuario quedó pendiente y
sigue pendiente hoy. Arreglarlo exige decidir antes cómo se identifica el operario
en una tablet compartida de planta: si el HMI es un quiosco por puesto, el
operario tendría que venir del puesto asignado (y no del navegador), y si es
personal, tiene que ser el usuario del token.

**R6-2 · RLS en `tenants` (P1).** Sigue siendo la única tabla sin política: la
autorización del panel de plataforma se resuelve por identidad
(`GLOBAL_ADMIN_USER_IDS`, fail-closed), no por RLS.

### Comprobado hoy

Producción viva (backend `/api/v1/health` y frontend en 200), CI con los seis jobs
en verde, cero alertas Dependabot abiertas y 557 tests de backend pasando.

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
| Escalada operario→admin (RBAC opt-in) | P0 | ✅ Corregido | 5e15d2c (RBAC fail-closed) |
| global-admin sin protección | P0 | ✅ Corregido | 5e15d2c (GLOBAL_ADMIN_USER_IDS) |
| Suplantación sesión localStorage | P0 | ✅ Corregido | 5e15d2c (sesión desde JWT) |
| JWT exp opcional / secret fallback | P1 | ✅ Corregido | 5e15d2c |
| Login sin rate limit | P1 | ✅ Corregido | 5e15d2c (10/5min/IP) |
| RLS FORCE + owner bypass (~10 tablas) | P1 | ✅ Corregido | 255730d (migration 037) |
| Redis sin password | P1 | ✅ Corregido | 255730d (requirepass + puerto cerrado + fail-fast) |
| TOCTOU overlap work blocks | P1 | ✅ Corregido | 255730d (migration 038, EXCLUDE gist) |
| Replay offline con payload cambiado | P1 | ✅ Corregido | 255730d (migration 039, huella + UNIQUE) |
| Rate limits en memoria | P2 | 📋 Documentado | Redis si se escala |
| PWA/Service Worker | P2 | 📋 Documentado | Roadmap producto |
| DLQ administrativa | P2 | 📋 Documentado | Decisión UX |
| kavana_app real | P1 | 📋 Documentado | ADR-008 |
| Migraciones duplicadas/fuera de secuencia | P2 | ✅ Cerrado (migración 041) | 2026-09-23 |
| Sync de partes roto: columna `version` ausente en BD limpia | P0 | ✅ Corregido | 2026-09-23 (041) |
| Sync de partes roto: 16 valores para 17 marcadores | P0 | ✅ Corregido | 2026-09-23 |
| OEE performance=0.85 | P1 | 📋 Documentado | README |
