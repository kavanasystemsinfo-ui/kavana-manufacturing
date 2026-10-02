# ADR-009: Aislamiento efectivo con RLS (rol de aplicación sin BYPASSRLS)

**Status:** Propuesta — aprobada por Jorge el 2026-09-27, pendiente de ejecutar
**Fecha:** 2026-09-27
**Decisor:** Jorge Adán (con análisis del agente)
**Contexto:** Manufacturing en producción, tras descubrir que las políticas RLS no filtraban nada
**Última actualización:** 2026-09-27

---

## Contexto

El ADR-001 decidió aislamiento por Row-Level Security para que "ni un bug del backend
pueda exponer datos entre clientes". La migración 037 añadió `FORCE ROW LEVEL
SECURITY` precisamente porque el propietario de las tablas se saltaba las políticas.

Al auditar producción el 2026-09-27 apareció el agujero que quedaba: **el rol con el
que conecta la aplicación (`neondb_owner`) tiene `rolbypassrls = true`**, y `BYPASSRLS`
esquiva las políticas incluso con `FORCE`. Medido en producción:

```
                 tabla               | RLS | FORCE | políticas kavana_app
 tenants                             | f   | f     | 0
 ai_context_documents / chunks       | t   | t     | 0 (política TO public con el cast)
 quality_checks / cost_entries       | t   | t     | 0 (política TO public con el cast)
 orders, users, movimientos, etc.    | t   | t     | 1 cada una
 rol de la aplicación                | —   | —     | rolbypassrls = true  ← el agujero
```

Conclusión: el aislamiento lo sostiene hoy el código (cada consulta filtra por
`tenant_id` dentro de una transacción que fija `app.current_tenant_id`), no la base.

## Evidencia del mecanismo (medido en la base local, 2026-09-27)

Con el rol `kavana_app` (sin `BYPASSRLS`, con permisos de lectura y escritura):

| Consulta | Filas visibles |
|---|---|
| `SELECT count(*) FROM orders` sin contexto | 0 |
| `SELECT count(*) FROM orders` con `app.current_tenant_id = 1` | 1 |

Es decir: el mecanismo funciona hoy mismo, solo falta conectar la aplicación con ese
rol. Y con el rol actual, la misma consulta devuelve las 1.214 órdenes de todas las
plantas.

## Decisión

**La aplicación se conecta con un rol propio (`kavana_app`) sin `BYPASSRLS` ni
privilegios de propietario; los procesos que legítimamente necesitan ver todas las
plantas (migraciones, datos de prueba, tareas de mantenimiento) usan el rol
propietario, que no se expone a la aplicación.**

Piezas concretas:

1. `kavana_app` con `LOGIN`, contraseña propia y los permisos ya concedidos
   (`GRANT SELECT/INSERT/UPDATE/DELETE ON ALL TABLES` + `USAGE ON ALL SEQUENCES`).
2. `tenants` entra en RLS con política propia: cada planta se ve a sí misma. El
   catálogo de plantas lo necesita el login antes de saber quién entra, y se resuelve
   con una función `SECURITY DEFINER` acotada (devuelve solo id, nombre, estado y
   subdominio) en vez de dejar la tabla abierta.
3. Las consultas que ocurren **antes** de conocer la planta se resuelven igual: una
   función `SECURITY DEFINER` para el login que devuelve exactamente la fila que hace
   falta. Nunca abriendo `users`, que contiene los hashes de las contraseñas.
4. Los tests de integración y el `e2e-setup` siguen con el rol propietario (siembran
   datos fuera de contexto y con RLS fallan: comprobado, `new row violates row-level
   security policy for table "users"`). Se añade una credencial extra en el CI.

### Alternativas descartadas

- **Dejarlo como está**: el aislamiento depende de que nadie olvide un filtro. Un
  descuido en una consulta nueva equivale a una fuga entre clientes.
- **`SET ROLE kavana_app` al principio de cada transacción**: el pool reutiliza
  conexiones, así que cualquier consulta que no pase por esa transacción se ejecuta
  con el rol propietario y sin filtro. Fallo silencioso, justo lo que queremos evitar.
- **Un segundo pool "de sistema" con el rol propietario** para las consultas previas
  al contexto: cualquiera puede importarlo por error y el aislamiento se cae sin que
  nadie lo note. Las funciones acotadas limitan el daño al caso concreto.
- **RLS sin `FORCE`**: el propietario seguiría viendo todo.

## Consecuencias

- **A favor**: un bug del backend deja de poder leer datos de otra planta; la
  garantía pasa a estar donde el ADR-001 dijo que estaba.
- **En contra**: cualquier consulta que hoy funcione sin contexto devolverá cero
  filas. Hay que revisarlas todas antes de cambiar la credencial (listado en la
  sección de ejecución). Es un cambio de credencial en Render más una migración.
- **Riesgo de despliegue**: alto si se hace sin probar en la copia. Se hace por
  fases, con la copia por delante, el vigilante activo y vuelta atrás de un minuto
  (cambiar `PGUSER`/`PGPASSWORD` a los del propietario).

## Ejecución por fases

1. **Hecho (2026-09-27)** — Migración `042`: rol con atributos de seguridad (`NOBYPASSRLS`
   reafirmado en cada aplicación), permisos, `tenants` bajo RLS y tres funciones
   `SECURITY DEFINER` acotadas (`auth_login_lookup`, `auth_tenant_by_subdomain`,
   `auth_update_password_hash`) para lo que ocurre antes de conocer la planta. El
   servicio de login usa esas funciones. `auth-login` ya no toca `users` directamente.
2. **Pendiente** — Consultas que se ejecutan sin contexto de planta. Medido, no
   supuesto: con el rol de aplicación en la base local, el **listado de pedidos
   devuelve 0 filas** y el **contexto del operario llega con nombre y puesto nulos**,
   porque esas consultas no pasan por la transacción con contexto. Son las que hay
   que corregir antes de cambiar la credencial en producción.
3. **Pendiente** — Pruebas de aislamiento: escritas y en verde (7 casos: sin contexto
   no se ve nada; con contexto solo lo propio; INSERT cruzado rechazado; UPDATE
   cruzado no toca nada; el login resuelve solo la planta de su subdominio). Corren en
   el CI en cada push.
4. **Pendiente** — Suite completa y E2E con la credencial de aplicación.
5. **Pendiente** — Despliegue: variables de Render (leyendo la lista completa antes de
   reenviarla, lección del 2026-09-27) y verificación en vivo con el vigilante.

**Señal de revisión**: la decisión queda validada cuando la suite completa pasa con la
credencial de aplicación y una prueba demuestra que la planta A no ve la B.

## Fase 2 — Inventario de consultas sin contexto (medido 2026-09-27)

Barrido del backend con verificación puntual de cada hallazgo. Son **55 puntos de
consulta** en 10 archivos. Agrupados por lo que hay que hacer:

| Grupo | Dónde | Qué hay que hacer |
|---|---|---|
| **Login** (hecho) | `auth-login.service.ts` :83, :121, :152, :171 | Resuelto con las funciones `SECURITY DEFINER` de la 042. Es un caso legítimo sin contexto: no se arregla con `tenantQuery`. |
| **Cola de trabajos** | `queue/processors/oee-recalc.ts` :26-39, `report-export.ts` :26-44, `document-ingest.ts` :61-98 | Bug de alcance: fijan `set_config(..., true)` (local a la transacción) **sin abrir transacción**, así que el contexto muere con esa sentencia y el resto se ejecuta sin él. Hoy funciona porque el rol se salta las políticas; con RLS se quedarían mudos (0 filas, sin error). Envolver en transacción explícita. |
| **Endpoints autenticados** | `core-mes-production.service.ts` :38, :50, :66, :201, :218; `orders.controller.ts` :30; `core-mes-production.controller.ts` :32 | Migrar a `tenantQuery`/`withTenantTransaction`. **Medido en vivo**: con el rol de aplicación el listado de órdenes devuelve 0 filas y el contexto del operario llega con nombre y puesto nulos. |
| **Módulos OEE, calidad y coste** | `oee.service.ts` :53, :60, :94, :136, :167; `quality.service.ts` :30, :41, :53; `cost.service.ts` :28, :39, :51 | Mismo cambio, mecánico. Los INSERT además fallan por el `WITH CHECK`. |
| **Catálogo de plantas** | `tenant-capabilities.service.ts` :27, :45, :108, :113, :132, :189, :194, :208, :278, :302; `global-admin.service.ts` :48, :67, :92-:95, :107, :113, :134, :146, :190, :215, :222; `ai-config.service.ts` :54, :74, :110; `tenant-capabilities.service.ts` :257, :262 (`tenant_config_audit`) | Lo más delicado: `getCapabilities` corre **en casi toda petición** vía guard, y el panel global y el alta de planta son cross-tenant por diseño. Decidir por caso: contexto de planta cuando el admin es de la planta, o función acotada cuando es el panel de plataforma. |
| **Ya correcto** | `incidencia-uploads.service.ts` :76 (usa una función `SECURITY DEFINER`) | Nada. |
| **Deuda aparte** | `incidencia-uploads.service.ts` :98 (`set_config(..., false)`, alcance de sesión sobre una conexión del pool: puede filtrar el contexto a la siguiente consulta de esa conexión); `report-export.ts` :40 lee `cost_records`, tabla que no existe (la app escribe `cost_entries`) | Arreglar de paso: son bugs propios, no del RLS. |

**No se aplica la 042 en producción hasta cerrar la fase 2**: `getCapabilities` corre en
casi toda petición y, con el catálogo de plantas cerrado y sin contexto, dejaría la
aplicación sin capacidades.

