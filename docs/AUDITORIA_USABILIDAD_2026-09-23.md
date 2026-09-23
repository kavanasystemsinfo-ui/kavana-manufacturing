# Auditoría de código y usabilidad — Kavana Manufacturing (2026-09-23)

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

## Propuesto, sin implementar todavía

Ordenado por lo que más nota el usuario por unidad de esfuerzo.

### Usabilidad

**U1 · El operario sin puesto asignado no entiende por qué no tiene trabajo.**
`GET /orders/available` filtra por `users.default_workstation_id`. Si el operario
no tiene puesto, la pantalla dice "Sin órdenes asignadas a tu puesto", que es
cierto pero no accionable: el operario no puede arreglarlo. Propuesta: detectar el
caso (puesto nulo) y mostrar "No tienes un puesto asignado. Pídeselo a tu
supervisor" con el nombre del puesto si lo hay. Es un cambio pequeño en el
`EmptyState` del panel y hace que el operario sepa a quién acudir.

**U2 · Cerrar sesión no navega.** `handleLogout` limpia el almacén y pinta el login
del tenant en la misma URL, así que la barra de direcciones sigue diciendo `/demo`.
Para quien lo usa parece que no ha salido. Propuesta: volver a `/` al cerrar.

**U3 · Un puesto ocupado no se ve ocupado.** El estado por puesto (verde/amarillo/
rojo) existe en el backend (`workstations-status`, con corte de 4 h) y el
supervisor lo tiene, pero el semáforo no se actualiza solo: hay que recargar.
Propuesta del plan (H2.3): refresco cada 30 s. Es el tipo de detalle que hace que
una demo parezca viva.

**U4 · El aviso de "sin conexión" solo lo ve el operario.** El resto de paneles
siguen como si nada mientras el backend no responde. Propuesta (H2.9): banner
global persistente.

**U5 · Falta el atajo de teclado del asistente.** `Cmd/Ctrl+K` para abrir el
AI Advisor y `Esc` para cerrar (H2.8). Barato y muy visible en una demo.

### Código y proyecto

**C1 · Hay dos suites E2E.** La antigua, en `e2e/` de la raíz, mockea la API y no
la ejecuta el CI; la nueva, en `frontend/e2e/`, va contra la aplicación real. El
script `test:e2e` de la raíz apunta a la vieja. Propuesta: dejar una sola (la que
prueba de verdad) y borrar la otra.

**C2 · `npm install` no funciona en el repo.** `@nestjs/core@12` pide
`@nestjs/common@^12` y el proyecto usa la 11, así que hay que instalar siempre con
`npm ci`. Es una trampa para quien clone el proyecto: la primera orden que prueba
cualquiera falla. Propuesta: alinear las versiones de NestJS en una tarea propia,
con las suites como red.

**C3 · El contrato de roles no estaba cubierto por tests.** Los specs unitarios
mockean el servicio y no ven los decoradores, así que un permiso mal puesto no
rompe nada hasta que lo sufre un usuario. Añadido `catalog-roles.spec.ts`, que
comprueba la metadata que lee el guard. Merece la pena extenderlo a los demás
controllers con rol.

## Cómo se ha verificado

- Base de datos desde cero (40 migraciones + seed) y el flujo completo en verde.
- API real: supervisor y operario, antes y después del cambio de permisos.
- 352 tests de backend, 148 de frontend, lint y typecheck limpios, CI en verde.
