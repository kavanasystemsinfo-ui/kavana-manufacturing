# roadmapmanufacturing.md — Roadmap de mejora del panel de supervisión

Proyecto: KAVANA Manufacturing (MES). Repo `/root/kavana-manufacturing`.
Origen: encargo de Jorge (28/09/2026) tras una auditoría del panel de supervisor
hecha como usuario real contra la demo local (`http://localhost:8080`).
Estado: **fases 0 a 5 ejecutadas y subidas a GitHub** (push `f7fb9f3`, 2026-10-04).
Blindaje de la demo redefinido por decisión de Jorge (29/09) y verificado contra demo real.
**Fase 2 RLS completada** (rol `kavana_app` NOBYPASSRLS, 55 consultas migradas a `tenantQuery`),
**máquina de estados de órdenes**, **permisos por método**, **touch targets 64px**,
**Pausar/Reanudar + IncidenciaModal en clásico**, **817 tests unificados** (605 backend + 212 frontend).

## 1. Cómo se ha auditado (método)

Navegador real con sesión de supervisor (`demo` / `047` / `kavana`), en dos
temas (clásico y Kavana), en escritorio (1440×900) y móvil (390×844), capturando
pantalla y midiendo el DOM. Cada hallazgo de abajo es una medición, no una
impresión: altura de página, número de nodos, número de botones, tamaño y
respuesta de cada petición de red.

## 2. Hallazgos medidos

### 2.1 Escala y densidad (los dos temas)

- `GET /api/v1/orders` devolvía las 1.215 órdenes sin filtro ni tope (545 KB).
  El frontend las pintaba todas: la página del panel clásico medía 180.342 px de
  alto (334.974 px en móvil) y la del tablero Kavana 135.985 px con 14.617 nodos
  DOM y 1.203 tarjetas en la columna COMPLETADA.
- El clásico montaba 1.214 botones «Actividad» y 1.214 botones «Eliminar».
- No había búsqueda, filtros, orden ni paginación en ningún tema, aunque el panel
  del OPERARIO sí tiene buscador de órdenes. INCOHERENCIA INTERNA del producto.
- Columnas del tablero de 240 px fijos: en 1440 px el tablero ocupaba 752 px y el
  52 % de la pantalla quedaba vacío.
- Datos de la demo: 1.203 completadas, 11 en progreso, 0 pendientes. La columna
  PENDIENTE (vacía) ocupaba un tercio del ancho; el histórico era scroll infinito.

### 2.2 Funcionalidad (probada con navegador real)

- El ARRASTRE funcionaba: soltar una tarjeta lanzaba `PUT /api/v1/orders/:id` con
  el estado correcto. Lo que fallaba era el blindaje de la demo
  (`backend/src/auth/demo-readonly.middleware.ts`): responde 403 «Demo de solo
  lectura…» para todo DELETE/PUT/PATCH del tenant 1, así que el gesto estrella
  acababa en un error rojo en pantalla. Igual con Iniciar/Completar/Eliminar.
- Las tarjetas del tablero mostraban «—» como identificador: `ORDER_FIELDS`
  (`backend/src/orders/orders.service.ts`) no proyectaba `o.code`, aunque la
  columna existe y está poblada en las 1.215 órdenes.
- «+ Nueva Orden» funcionaba (POST 201) y la orden aparecía en PENDIENTE. Pero el
  desplegable de Puesto del tema Kavana listaba TODOS los puestos y el del clásico
  solo los `status === 'active'`: la misma pantalla, dos criterios.
- Pestaña «Workstations» en inglés en un panel en español.

### 2.3 Coherencia entre los dos temas

- Misma acción (cambiar el estado de una orden): en clásico, botones por tarjeta;
  en Kavana, arrastrar entre columnas. El usuario que cambiaba de tema perdía el
  gesto y tenía que reaprender.
- El tablero de incidencias SÍ era un componente compartido (correcto); el de
  órdenes no.
- El asistente IA existía en Kavana y en el login, y no en el clásico.
- El clásico no usaba los componentes base compartidos (`Loading`, `EmptyState`,
  `ErrorState`): pintaba divs propios y con colores del tema oscuro.

### 2.4 Responsive y accesibilidad

- Móvil clásico: desborde horizontal (484 px en un viewport de 390 px), selector
  de tema cortado, «Progreso 0 / 25 (0%)» partido en tres líneas y botones por
  debajo de los 44 px táctiles.
- Móvil Kavana: «+ Nueva Orden» truncado, pestaña «Incidencias» cortada, tablero
  con scroll horizontal sin ninguna pista y arrastre compitiendo con el scroll.
- Contraste flojo: texto secundario gris sobre fondo oscuro, badge «En Progreso»
  naranja sobre durazno y barra de progreso al 0 % casi invisible.
- «Completar» y «Eliminar» pegados en la misma fila, sin confirmación.

### 2.5 Bloqueante encontrado de paso (resuelto)

- `frontend/src/OperatorPanel.tsx` estaba corrupto en `HEAD` (commit `c214ac2`):
  todo el fichero en una sola línea con `\n` literales, un `import` dentro del
  componente y sin la llamada a `useMyShiftKPI()` que el JSX usaba. Ni `tsc` ni
  `eslint` ni `vite build` pasaban por ahí: el frontend del repo no compilaba.
  Restaurado desde `39bac73` (472 líneas); la copia corrupta queda en
  `/root/backups/OperatorPanel.tsx.corrupto-HEAD-20260928`.
- El feature flag `quick_registration` NO está en `tenants.feature_matrix` del
  tenant 1. La parte de UI de ese registro rápido queda fuera de este roadmap.

### 2.6 Dos hallazgos nuevos de la verificación

1. **El blindaje de la demo no cubría las incidencias.** El comentario del
   `app.module.ts` dice que se añadieron para que un visitante no pudiera borrar
   incidencias del histórico, pero estaban en la lista del `TenantContextMiddleware`
   y NO en la del `DemoReadOnlyMiddleware`. Consecuencia real: en la demo se podía
   mover y BORRAR una incidencia del histórico, y sin embargo mover una orden daba
   403. Asimétrico respecto a la intención escrita en el propio código.
   **DECIDIDO por Jorge (29/09/2026): opción (b).** El blindaje ahora bloquea solo
   el borrado (y la edición de catálogo); el cambio de estado de órdenes e
   incidencias sí persiste en la demo. Implementado y verificado: ver 2.7.
2. **La base del E2E en el VPS se queda vieja.** `e2e-setup.js` no reaplica la
   cadena de migraciones si el esquema ya existe; con una base creada antes de la
   042, el login del E2E moría con `function auth_login_lookup(unknown, unknown)
   does not exist`. Recreada en esta sesión (drop + create + setup). En el CI no
   pasa porque el servicio de Postgres nace vacío.

### 2.7 Verificación del 29/09 (cierre de la decisión 2.6.1)

Al implementar la decisión aparecieron tres cosas más, todas corregidas:

- **Una spec en rojo desde la fase 1**: `src/cross-tenant-isolation.spec.ts`
  llamaba a `service.listOrders()` sin filtros, y el contrato nuevo los exige
  («Cannot read properties of undefined (reading 'status')»). El `tsc` del
  backend tampoco estaba limpio como decía el informe de la fase 1: tres casts
  de `orders.spec.ts` declaraban una tupla de cuatro elementos sobre una llamada
  de tres. La suite completa del backend, ejecutada ahora, queda **582/582** y
  `tsc -p tsconfig.json` en 0 errores.
- **El healthcheck del backend apuntaba a `/health`** (404 desde el prefijo
  `api/v1`), así que el contenedor llevaba marcado `unhealthy` de forma
  permanente aunque la API respondiera: `docker ps` mentía. Corregido en
  `backend/Dockerfile` a `/api/v1/health`; el contenedor queda `healthy`.
- **El aviso de incidencias solo se pintaba en el tema Kavana.** Mover o intentar
  borrar una incidencia desde el panel clásico (el que abre por defecto) no
  contaba nada: `incidenciaNotice` existía en el hook pero el clásico no lo
  renderizaba. Añadido con los mismos tokens de tema.
- **Verificación con la demo real reconstruida** (nginx :8080 → backend :3001 →
  Postgres local), script `scripts/verificar_blindaje_demo.py`: 10/10 en verde —
  mover orden persiste, mover incidencia persiste, borrar orden 403, borrar
  incidencia 403, editar puesto 403, la demo sigue sirviendo datos.
- **Comprobado en el navegador real**: con la cuenta de admin, borrar una
  incidencia responde con el aviso neutro «En la demo no se borra: los datos del
  histórico son de solo lectura.» (`role="status"`, ningún `role="alert"` y
  ningún banner rojo); con la cuenta de supervisor, «Iniciar» sobre una orden
  muestra «La orden AUDIT-KAVANA-1 pasa a En Progreso.» y el estado sigue ahí
  tras recargar.

### 2.8 Repaso del 29/09 (queja de Jorge sobre el tablero en producción)

Jorge probó la demo publicada (`www.manufacturing.kavanasystems.com/demo`) y contó
dos cosas: no le dejaba mover una tarjeta y las tres columnas estaban demasiado
estrechas para la pantalla. Las dos son ciertas y las dos tienen la misma causa
parcial: **lo que estaba mirando era producción, que corre el código viejo**
(sin push todavía). El aviso rojo, el «—» como N.º de orden, la pestaña
«Workstations» y las columnas de 300 px son la versión anterior.

Lo que sí había de verdad detrás:

- **El ancho de columnas solo se había arreglado en móvil.** Fase 5 dejó las
  columnas a 240/260/300 px fijos en escritorio: medido en el tablero real, tres
  columnas de 300 px dentro de un contenedor de 1.133 px dejaban ~200 px muertos
  a la derecha. Corregido: en `sm+` las columnas son `flex-1` con mínimo de
  240 px y sin tope, así que se reparten el ancho. Medición tras el cambio:
  **367 px cada una, 0 px sin usar**, sin scroll horizontal.
- **El E2E podía dar verde con el backend viejo.** El `webServer` de Playwright
  arranca `node dist/main.js`, y `dist/` es un compilado que no se regenera solo:
  el spec antiguo (que esperaba el aviso de «solo lectura») pasó después de
  cambiar el middleware porque estaba corriendo el `dist` anterior. Regla que
  queda: **recompilar `tsc -p tsconfig.build.json` antes de correr el E2E**, y
  desconfiar de un verde que no cambia cuando cambia el comportamiento.
- La suite E2E del panel se ha reescrito para el comportamiento nuevo: el
  arrastre tiene que devolver **200**, la tarjeta tiene que seguir en la columna
  de destino **después de recargar**, y el borrado blindado tiene que explicarse
  en neutro sin borrar nada.

### 2.9 Decisión pendiente para desplegar: qué pasa en la demo pública

El blindaje nuevo permite mover estados, y en producción la demo del tenant 1
vive en la **misma base que la aplicación** (Neon `kavana_mes`). Es decir: si se
sube tal cual, un visitante puede cambiar el estado de órdenes e incidencias de
la demo y ese cambio queda guardado. Opciones (las tres son defendibles):

- (a) Subir tal cual. La demo refleja lo que el producto hace; lo que desordene
  un visitante lo desordena el siguiente (máximo, mover una tarjeta de columna).
- (b) Subir y **programar la regeneración diaria** (`scripts/simulate-daily-manufacturing.cjs`
  existe y es idempotente, pero hoy NO está en ningún cron): la demo se limpia
  sola cada noche.
- (c) Subir con el blindaje estricto en producción y el nuevo solo en la demo
  del VPS (una variable de entorno decide), asumiendo que en la web pública el
  gesto estrella sigue sin persistir.

### 2.10 Limpieza diaria de la demo pública (29/09)

Jorge eligió subir el panel y programar la limpieza diaria de la demo. La limpieza
existía a medias y no era solo «poner el cron»:

- **El wrapper existía, el cron no.** `~/.hermes/profiles/kavana/scripts/simulate_manufacturing_daily.sh`
  estaba escrito tal cual para cron pero no aparecía en ningún crontab. Programado
  a las 06:00 UTC (log en `/var/log/manufacturing-demo-daily.log`).
- **El script era un no-op silencioso.** Con `pg@8.23`, llamar a `query` sin
  `connect` hace que el proceso salga con código 0 sin ejecutar nada: el cron
  habría dado verde para siempre sin tocar la base. Añadido `await c.connect()`.
- **El generador estaba obsoleto respecto al esquema**: insertaba `created_at` y
  `updated_at` en `production_work_blocks`, columnas que ya no existen. Reescrito
  con las columnas reales (`client_event_id`, `synced_at`, `registered_at`,
  `is_offline_event`, `version`).
- **La restricción de exclusión de la tabla** (`tenant_id, operator_id, rango
  horario`) hacía inviable el reparto anterior: con 10 operarios y 15 puestos,
  varios puestos comparten operario en el mismo turno y sus tramos se solapaban.
  Ahora cada puesto recibe su propio subtramo dentro del turno, y la parada se
  descuenta del tiempo de producción en vez de sumarse encima.
- Verificado: en local 12 órdenes y 54 partes del día, 10 operarios distintos,
  0 solapes; en producción lo mismo. Las órdenes de hoy cierran solas mañana y lo
  que cree el visitante con la cuenta de operario caduca a las 24h.
- Lo que la limpieza NO hace (dicho claro): no deshace un movimiento de estado que
  el visitante haga sobre una orden vieja. Un `completed` movido a `in_progress`
  se vuelve a cerrar el día siguiente; un `pending` movido a `completed` se queda
  así. Si eso molesta, el siguiente paso es un reset de estados contra una copia
  de referencia.

### 2.11 El 401 del alta, investigado (29/09)

En la suite E2E, `tenant-wizard.spec.ts` falló una vez: el wizard crea el tenant
con su admin y el `login-by-tenant` de ese admin recién nacido devolvió **401**;
el reintento pasó. Qué se ha medido:

- **El alta y el login funcionan.** 12 altas por API con login inmediato después:
  12/12 en 201. Dos pasadas de la suite completa con `--retries=0`: 13/13 y 13/13.
- **El reintento pasaba por una aserción floja, no por el código.** El trace de la
  pasada que falló (guardado por `trace: on-first-retry`) muestra que en el
  reintento el alta devolvió **409** (el tenant 97 ya existía) y el spec lo dio por
  bueno: comprobaba el nombre del tenant con `getByText`, y el propio wizard pinta
  ese nombre («Se creará el cliente Acme Wizard E2E…»), así que la aserción se
  cumplía con el wizard abierto y el alta rota. El login del reintento sí devolvió
  201 con las credenciales creadas en el intento anterior.
- **Arreglado**: la aserción ahora exige que el wizard esté cerrado y que el
  nombre aparezca como **celda** de la tabla de clientes, y el spec borra el tenant
  97 por API antes de empezar para ser idempotente en los reintentos. Verificado:
  el spec dos veces seguidas en el mismo run → 2/2 en verde (antes, la segunda
  pasada habría dado 409 y el test habría pasado igual sin crear nada).
- **Lo que no se ha podido cerrar**: la causa del 401 puntual. No se reproduce
  (25 intentos: 12 por API y el spec trece veces) y las hipótesis se han ido
  descartando con evidencia: no es el límite por IP (eso es 429), no es el
  contexto de tenant que queda pegado en el pool (el backend del E2E entra como
  superusuario y salta RLS), no es el dato (el hash del admin creado verifica
  contra «acme1234» y el tenant existe). Si vuelve a aparecer, ahora la suite lo
  dirá con el alta ya verificada y con trace del intento que falle.

## 3. Lo que se ha hecho (con evidencia)

### Fase 0 — Desbloquear el repo (hecha)

- `OperatorPanel.tsx` restaurado desde `39bac73`.
- Evidencia: `tsc --noEmit` limpio, `eslint` 0 errores (274 avisos
  preexistentes), `vitest run` **207 tests / 27 ficheros en verde**,
  `vite build` correcto y `tsc -p tsconfig.build.json` del backend correcto.

### Fase 1 — API de órdenes utilizable (hecha)

- `o.code` en la proyección de órdenes y en el tipo `Order` del frontend.
- `GET /orders` con `status` (lista separada por comas), `workstation_id`, `q`
  (código, modelo o puesto) y `limit`/`offset`, validado con zod: tope por
  defecto 200 y máximo 500.
- Tests: 28 en `backend/src/orders/orders.spec.ts` (estados inventados se
  descartan, el SELECT lleva `o.code`, el tope por defecto y la traducción de
  filtros a parámetros SQL).
- Criterio de aceptación verificado por E2E contra la aplicación real y la base
  real: `?status=completed` deja fuera una orden en progreso y una búsqueda
  inexistente deja la tabla vacía.

### Fase 2 — Un solo comportamiento para los dos temas (hecha)

- Componentes compartidos nuevos: `components/supervisor/OrderFiltersBar.tsx`
  (búsqueda con espera de 350 ms, filtro de estado, filtro de puesto, conmutador
  Tablero/Lista, contador y «Cargar más»), `components/supervisor/OrdersTable.tsx`
  (lista densa con columnas alineadas) y `components/supervisor/ConfirmButton.tsx`
  (confirmación en el propio botón para las acciones destructivas).
- Los dos temas usan los mismos componentes y las mismas capacidades: el clásico
  abre en lista y el Kavana en tablero, y los dos pueden cambiar de vista y
  filtrar igual. El cambio de estado ya no depende de un solo gesto: hay arrastre
  en el tablero, botones en la lista y botón en cada tarjeta.
- El selector de puestos del formulario filtra solo los activos en los dos temas.
- «Workstations» pasa a «Puestos».

### Fase 3 — Tarjetas de orden con la información que decide (hecha)

- Tarjeta y fila llevan N.º de orden, modelo, puesto, cantidad, progreso con
  barra legible (`components/supervisor/OrderProgress.tsx`, `role="progressbar"`
  con valor) y defectos.
- Estados con icono además de color, en un único mapa por tema
  (`ORDER_STATUS_BADGE` / `ORDER_STATUS_ICON` en `utils/ui-tokens.ts`), así que el
  mismo estado se pinta igual en las dos pantallas y en las dos vistas.

### Fase 4 — Demo que no castiga el gesto estrella (hecha, con matiz)

- El cambio de estado es optimista (la tarjeta se recoloca al soltarla) y, si el
  backend responde 403 por el blindaje de la demo, el panel muestra un aviso
  NEUTRO («movimiento registrado en pantalla; el histórico es de solo lectura»)
  en lugar del error rojo. El borrado en demo también explica por qué no se borra.
- Movimiento real y probado: el E2E comprueba que el arrastre lanza
  `PUT /api/v1/orders/:id` con `{"status":"in_progress"}` y que no queda ningún
  `role="alert"` en pantalla.
- Matiz honesto, ya resuelto: en el tenant demo el cambio **sí persiste** desde
  la decisión de Jorge del 29/09 (ver 2.6.1). El aviso neutro queda solo para lo
  que el blindaje sigue rechazando: el borrado y la edición de catálogo.

### Fase 5 — Responsive y accesibilidad (hecha)

- Cabecera con `flex-wrap` (ya no se corta el selector de tema), pestañas con
  scroll horizontal y sin truncar, `min-h-[44px]` en los controles principales.
- Tablero: columnas de `80vw` con tope en móvil (antes 240 px fijos), `scroll-snap`,
  pista de deslizamiento en móvil y columna de CANCELADA solo si hay canceladas.
- Avisos y estados vacíos con el par de clases del tema (`utils/ui-tokens.ts`
  ampliado: `SURFACE`, `INPUT`, `BUTTON_*`, `NOTICE_INFO`), y `Loading`,
  `EmptyState` y `ErrorState` aceptan `isClassic` para no pintarse con colores del
  tema oscuro dentro del panel claro.

## 4. Qué falta para cerrar

1. ~~Repintar los contenedores de la demo~~ (hecho el 29/09 para el blindaje y el
   healthcheck) y volver a auditar el panel con capturas de los dos temas en
   escritorio y móvil: **pendiente la pasada de capturas, y bloqueada por
   credenciales**. Las capturas del interior del panel exigen entrar con un
   usuario y esta sesión no puede recibir contraseñas (el gestor responde
   `prompt_unavailable` en sesión sin interfaz, y teclearlas está fuera de lo
   permitido). Desbloqueo: Jorge guarda el login de la demo con `hermes vault add`
   (o Ajustes → Contraseñas) y una sesión con interfaz hace la pasada. Las
   credenciales de la demo están impresas en la propia página de login.
2. Dossier de demo escrito el 29/09: `docs/DOSSIER-DEMO.md` (guion de demo de 5
   minutos, guion de vídeo de 3, comandos de verificación, evidencias y límites)
   y `docs/dossier-demo.html` (la misma historia en una hoja imprimible). Commit
   `9ffbb6f`, guion de vídeo en `22073ba`.
3. Suite E2E completa en verde (29/09): **13/13, 0 fallos**, con 3 flaky que
   fallaban siempre en el login, no en lo que probaban. Causa medida: el límite
   de login es 10 intentos / 5 min por IP y la suite entera entra en ráfaga desde
   la misma IP (429 → el test espera la navegación y muere a los 90 s). Arreglado
   por configuración: `MAX_ATTEMPTS` del limitador lee `LOGIN_MAX_ATTEMPTS`, que
   `playwright.config.ts` sube en el `webServer`; en producción la variable no
   existe y el tope sigue siendo 10. Antes de correr la suite hay que recompilar
   el backend, porque el `webServer` arranca `dist/main.js` y un dist viejo da
   verdes falsos (ver 2.8).
4. Informe final a Jorge: entregado el 29/09 y el push ya está hecho
   (`837245e` panel + `2d494f2` simulación diaria). La limpieza diaria de la demo
   está programada a las 06:00 UTC y verificada.

### Verificación ya hecha

- Suite E2E completa (12 pruebas, 1 worker): **10 en verde**, el wizard de tenants
  pasó al reintentar (429 de login por IP en ráfaga) y falló una prueba mía por
  depender del orden de la suite (daba por hecho que la orden del seed seguía en
  PENDIENTE y el flujo completo ya la había pasado a EN PROGRESO). Arreglada
  mirando en qué columna está y arrastrando a la otra: **3/3 en verde** en la
  repetición (`full-flow` + el spec nuevo).
- El spec nuevo verifica con la aplicación y la base reales que la búsqueda y el
  filtro de estado van al SERVIDOR (una búsqueda inexistente deja la tabla vacía,
  no hay cientos de filas pintadas), y que arrastrar una tarjeta lanza
  `PUT /api/v1/orders/:id` con el estado de destino y deja el aviso neutro sin
  ningún `role="alert"` en pantalla.
- Fallo de infraestructura resuelto de paso: nginx cacheaba la IP del backend al
  cargar la config, así que recrear el backend daba 502 hasta reiniciar el
  frontend. `frontend/Dockerfile` usa ahora `resolver 127.0.0.11 valid=10s` con
  `proxy_pass` por variable: la IP se re-resuelve en cada petición.

## 4b. Bitácora de decisiones tomadas sin consultar (revisables)

- El panel abre con las órdenes ACTIVAS (pendiente + en progreso) y el histórico
  se pide a propósito (filtro «Todas», filtro «Completadas» o «Cargar más»). Es la
  decisión que resuelve el scroll infinito sin borrarle información al supervisor.
- El tope por defecto son 60 filas en pantalla (el backend permite hasta 500).
- Los dos temas abren con la vista que les da carácter (clásico lista, Kavana
  tablero) pero tienen las dos vistas y los mismos filtros: cambiar de tema ya no
  obliga a reaprender nada.
- El movimiento de estado en la demo SÍ se guarda desde el 29/09 (decisión de
  Jorge): el gesto estrella tiene que funcionar en la demo. Lo que sigue blindado
  es el borrado del histórico y la edición de catálogo.
- El blindaje de la demo no se limita a "método destructivo = 403": es
  DELETE siempre + PUT/PATCH solo en `/orders/:id` y `/incidencias/:id`. Así un
  visitante puede mover el flujo pero no renombrar un puesto ni cambiar un
  usuario.
- Las comprobaciones del blindaje dejan de ser manuales: `scripts/verificar_blindaje_demo.py`
  las corre contra la demo real (10 comprobaciones) y `backend/src/app.module.spec.ts`
  fija el cableado de rutas, que era justo el agujero (incidencias no estaba en
  la lista).

## 6. Trabajo posterior a la fase 5 (ya en GitHub, commit `f7fb9f3`)

### 6.1 Fase 2 RLS — Aislamiento efectivo con rol de aplicación (completada)

- **Rol `kavana_app` con `NOBYPASSRLS`** (migración `042_rls_rol_aplicacion.sql`): el rol de aplicación ya no salta las políticas RLS.
- **Tabla `tenants` bajo RLS FORCE** con policy de aislamiento por `tenant_id` (contexto `app.current_tenant_id`).
- **Tres funciones `SECURITY DEFINER` acotadas** para operaciones que deben saltar RLS sin exponer datos cruzados:
  - `auth_login_lookup(subdomain, username)` — login por subdominio
  - `auth_tenant_by_subdomain(subdomain)` — resolución de tenant en onboarding
  - `auth_update_password_hash(user_id, hash)` — cambio de contraseña
- **55 consultas migradas a `tenantQuery`** (inventario medido en `docs/adr/632819a`): cada consulta del backend ahora pasa por `tenantQuery` que inyecta `SET LOCAL app.current_tenant_id` y `SET LOCAL app.actor_user_id` antes de ejecutar.
- **Tests de aislamiento en verde** (`backend/src/db/rls-aislamiento.db.spec.ts`): 7 pruebas (sin contexto no se ve nada, con contexto solo lo propio, INSERT/UPDATE cruzados rechazados, login solo resuelve su subdominio).
- **ADR-009** documentado en `docs/adr/009-rls-efectivo-rol-aplicacion.md` con plan completo y lista de consultas por grupos.
- **Pendiente para producción**: aplicar la migración 042 completa (solo las 3 funciones estaban en prod; RLS de tenants y rol kavana_app esperan fase 2 cerrada y desplegada).

### 6.2 Máquina de estados de órdenes (`feat(orders): implement state machine + order limits validation`)

- **Transiciones validadas** en `orders.service.ts`: `pending → in_progress → completed`, `pending → cancelled`, `in_progress → paused → in_progress`, `in_progress → cancelled`. Transiciones inválidas → 400.
- **Límites por puesto y operador** validados en creación y cambio de estado (capacidad, solape, carga máxima).
- Tests de integración contra BD real (`orders.db.spec.ts`) cubriendo transiciones válidas, inválidas, límites, concurrencia.

### 6.3 Permisos por método en endpoints de órdenes y costes

- **Órdenes** (`orders.controller.ts`): `GET/POST` → supervisor + tenant_admin; `PATCH /:id` (cambio estado) → supervisor + tenant_admin; `DELETE /:id` → solo tenant_admin.
- **Costes** (`cost-endpoints`): `GET` → supervisor + tenant_admin; `POST/PUT/DELETE` → solo tenant_admin.
- Spec de cableado (`backend/src/app.module.spec.ts`) extendida para cubrir estos endpoints.

### 6.4 Touch targets 64px en todos los paneles (`feat(ui): increase touch targets`)

- Botones, inputs, controles táctiles: `min-h-[64px] min-w-[64px]` en tema clásico y Kavana.
- Móvil: áreas de toque ≥ 48×48 px (cumple WCAG 2.5.5), antes varios controles estaban en 32–40 px.

### 6.5 Pausar/Reanudar + IncidenciaModal en tema clásico (`feat: add Pausar/Reanudar buttons and IncidenciaModal`)

- Botones **Pausar / Reanudar** en tarjetas de orden (lista y tablero) para supervisor clásico.
- **IncidenciaModal** compartido: crear/editar incidencias con adjunto de foto (BYTEA + QR session), validación magic bytes, rate limit 20/10min/IP.
- Usabilidad: tareas 1a y 2 del dossier de auditoría cerradas.

### 6.6 Cifra unificada de pruebas: 817 (605 backend + 212 frontend)

- Backend con BD (igual que CI): **605 tests** (antes se publicaba 582 sin BD, con aislamiento saltado).
- Frontend (vitest + Playwright E2E): **212 tests**.
- La cifra válida **sale de ejecutar la suite**, nunca de contar ficheros. Ver `docs/adr/24b6bef` y `5c4f116`.

### 6.7 OEE: una sola fórmula, objetivo ligado por ID, periodo validado

- `oee.calculo.ts` única fuente de verdad (panel, recálculo, asistente).
- Objetivo derivado del de líneas (`1 - debajo_del_objetivo/objetivo_absoluto`), no factor plano.
- Periodo validado en endpoint (400 si `startDate > endDate` o vacío); puestos sin partes → `sin_datos` no cero.
- Pendiente: nadie encola el recálculo (`QueueService` sin llamadas) y disponibilidad sobre declarado, no turno planificado.

---

## 5. Fuera de alcance (se dice, no se esconde)

- ~~La fase 2 del aislamiento con RLS y el rol de aplicación sigue pendiente (ADR-009).~~ **COMPLETADA** (commit `f7fb9f3`): rol `kavana_app` con `NOBYPASSRLS`, tenants bajo RLS FORCE, 55 consultas migradas a `tenantQuery`, tests de aislamiento en verde.
- El despliegue a producción y cualquier push: requieren la aprobación de Jorge.
- El registro rápido del operario (`quick_registration`): el flag no está activado y su UI está sin hacer.
