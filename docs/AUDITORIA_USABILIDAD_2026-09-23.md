# Auditoría de código y usabilidad: Kavana Manufacturing (2026-09-23)

Análisis hecho **ejecutando** la aplicación, no leyendo el código: base de datos
desde cero, backend y frontend levantados, y un E2E de punta a punta que recorre
el flujo real de un operario y su supervisor. Todo lo que aparece aquí tiene una
comprobación detrás; lo que no se ha podido verificar se dice.

## Resumen

El proyecto está en mucho mejor estado de lo que sugiere su lista de deuda: la
arquitectura multi-tenant es sólida (RLS forzado, FKs compuestas, roles
fail-closed) y las suites pasan (352 backend + 148 frontend). Los problemas serios
no estaban en la seguridad, estaban en **el camino que usa el cliente de verdad**:
registrar producción y verla. Tres de los cuatro hallazgos críticos de esta
auditoría hacían que el producto no se pudiera usar de punta a punta.

## Corregido en esta sesión

### 1. El supervisor no podía crear órdenes (usabilidad, P0)

**Síntoma**: el panel del supervisor ofrece "Nueva Orden de Producción" con dos
desplegables, Modelo y Puesto. Los dos salían vacíos. En la consola del navegador:

```
Error loading models: Error: Access denied. Requires one of the following roles: tenant_admin
Error loading workstations: Error: Access denied. Requires one of the following roles: tenant_admin
```

**Causa**: `workstations.controller.ts` y `manufacturing-models.controller.ts`
tenían `@RequireRole('tenant_admin')` **en la clase**, así que el supervisor
recibía 403 en los dos catálogos (medido: `GET /workstations` → 403 y
`GET /manufacturing-models` → 403 con su token). El formulario quedaba inservible:
podía pulsar el botón y no había nada que elegir.

**Por qué es un fallo y no una decisión**: el roadmap del propio proyecto lo dice
en el flujo vertical de la Fase 3, "el supervisor crea un puesto de trabajo" y
"el supervisor crea una orden". El permiso estaba en el sitio equivocado.

**Corrección**: roles por método. El supervisor lee y crea puestos (y edita),
lee el catálogo de modelos, y sigue sin poder borrar ni definir catálogos, que
es del administrador del tenant. Verificado después: supervisor 200 en los dos
GET, operario 403 en los dos (no ha ganado acceso), `DELETE /workstations` 403.

### 2. El registro de producción no funcionaba (código, P0)

Dos fallos encadenados en `POST /production/time-logs/sync`, el endpoint que
escribe los partes de trabajo. Los encontró el E2E de flujo completo:

- La columna `version` de `production_work_blocks` no existía en una base creada
  desde cero, porque la migración que la añade vivía fuera de
  `database/migrations/`. Ahora es `041_offline_conflicts_columns.sql`.
- El INSERT pasaba 16 valores para 17 marcadores: el `fingerprint` anti-replay se
  calculaba y no se enviaba. **Estaba roto también en producción.**

Detalle completo en `docs/KNOWN_ISSUES.md` (ronda 4).

### 3. Vulnerabilidad alta en `js-cookie` (dependencias, P0)

`GHSA-qjx8-664m-686j`, que entraba de forma transitiva por el SDK de Clerk.
Cerrada fijando `js-cookie` en `^3.0.7` y alineando el lock.

## Corregido después de la auditoría (2026-09-23, tarde)

**U1 · El operario sin puesto ya sabe a quién pedírselo.** El login devuelve el
puesto del usuario (con `LEFT JOIN`, para que quien no lo tiene pueda entrar igual)
y el panel distingue tres casos: buscando, con puesto y sin trabajo, y sin puesto.
El mensaje vive en una función pura (`frontend/src/utils/orders-empty-state.ts`)
con sus tests, y hay un E2E con un operario sin puesto que crea el seed.

**U2 · Cerrar sesión sale de verdad.** Limpiaba el almacén pero dejaba la
aplicación montada, así que el login se repintaba encima del panel y parecía que
seguías dentro. Ahora recarga: mueren también los temporizadores y la cola en
memoria.

**C1 · Una sola suite E2E.** La de `e2e/` en la raíz mockeaba la API y el CI no la
ejecutaba, pero era la que apuntaba el script `test:e2e` de la raíz. Se conservó lo
único que aportaba (que el tema moderno pinte de verdad y que el administrador
entre y vea su panel) como dos tests contra la aplicación real, se borró la vieja y
el script apunta ya a la suite que prueba de verdad.

**C2 · `npm install` funciona.** El backend declaraba `@nestjs/core@12` junto a
`@nestjs/common@11`, así que había que instalar siempre con `npm ci`. Alineado a la
12: el lock pierde los duplicados de la 11, `npm ci` sigue en 0 vulnerabilidades y
el backend compila y arranca.

**C3 · El contrato de roles cubre toda la API, y ha encontrado siete endpoints
mudos.** El guard es fail-closed: sin `@RequireRole`, un endpoint devuelve 403 a
todo el mundo, administrador incluido. Estaban así `GET /tenant/capabilities` (lo
pide el frontend en cada panel al arrancar, así que el panel caía a su almacén
local y un módulo desactivado seguía viéndose), `GET /tenant/tooling-types` y todo
el CRUD de `/incidencias` con sus estadísticas. Se fijaron las políticas por método
y el spec recorre ahora todos los controllers: es el test que los encontró.

Verificado contra la API real, con los tres roles (admin / supervisor / operario):

| Ruta | Antes | Después |
|------|-------|---------|
| `GET /tenant/capabilities` | 403 / 403 / 403 | 200 / 200 / 200 |
| `GET /tenant/tooling-types` | 403 / 403 / 403 | 200 / 200 / 403 |
| `GET /incidencias` | 403 / 403 / 403 | 200 / 200 / 200 |
| `GET /incidencias/stats` | 403 / 403 / 403 | 200 / 200 / 403 |
| `PUT /incidencias/:id` | 403 / 403 / 403 | 400 / 400 / 403 |
| `DELETE /incidencias/:id` | 403 / 403 / 403 | 200 / 403 / 403 |

## Lo que queda

- **Decisión de producto pendiente (tablero de incidencias en el tema clásico).**
  El tablero existe en el panel moderno del supervisor (y ahora también en el tab
  de incidencias del admin, con el mismo componente). El tema **clásico**, que es
  el que viene por defecto, sigue mostrando la lista con botones
  (Iniciar/Resolver/Cerrar) sin arrastre. Llevarlo ahí es reutilizar el componente
  compartido, pero cambia la pantalla que ven los usuarios hoy: se decide con
  Jorge, no por iniciativa propia.
- **Pulido de portfolio**: design tokens, ADRs 007-010 y licencia.
- **Ingeniería pendiente**: migración a `api/v1` con sus dos consumidores, contract
  tests OpenAPI, mutation testing con Stryker y el asistente de alta de tenant en
  tres pasos.
- **Corrección a esta auditoría**: la tarea 2.3 del plan (semáforo de puestos en
  vivo) YA estaba implementada, el panel del supervisor refresca cada 10 s. Aquí
  figuraba como pendiente y era un error.

## Cómo se ha verificado

- Base de datos desde cero (migraciones + seed) y los siete flujos E2E en verde.
- API real con los tres roles, antes y después de cada cambio de permisos.
- Backend 409/409, frontend 151/151, E2E 7/7, lint y typecheck sin errores, y los
  seis jobs del CI en verde.
