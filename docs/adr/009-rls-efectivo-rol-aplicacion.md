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
