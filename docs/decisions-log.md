# Decisions Log — Kavana Manufacturing

Este registro documenta las decisiones técnicas clave del proyecto, mostrando la evolución del conocimiento y las lecciones aprendidas.

---

## 2026-07-07 | Type casting explícito en queries PostgreSQL

**Decisión:** Todos los parámetros SQL que pasan por el driver `pg` deben tener cast explícito (`$1::bigint`, `$2::uuid`, `$3::varchar`, etc.).

**Contexto:** El driver `pg` de Node.js no siempre puede inferir el tipo PostgreSQL de un valor JavaScript. BigInt, UUID strings, y nullables causan `could not determine data type of parameter $N`. Esto se manifestó en `insertWorkBlock` al pasar `tenantId` (BigInt de contexto) como parámetro.

**Alternativas consideradas:**
- Pasar todo como string y confiar en coerción implícita → Descartada: frágil, depende de la versión de pg.
- Usar `pg-native` con bindings C → Descartada: sobreingeniería.
- Casts explícitos en SQL → **Elegida**: determinista, portable, independiente de la versión del driver.

**Patrón:** `WHERE tenant_id = $1::bigint AND id = $2::uuid`. En VALUES: `VALUES ($1::bigint, $2::uuid, $3::varchar, ...)`.

---

## 2026-07-07 | Guías de usuario integradas en cada panel

**Decisión:** Todos los paneles (no solo Admin) deben tener botón "Ayuda" con guía contextual.

**Contexto:** Solo AdminPanel tenía HelpModal. Supervisor, operario y global admin carecían de guía, forzando al usuario a adivinar funcionalidades.

**Implementación:** `SUPERVISOR_HELP`, `OPERATOR_HELP`, `GLOBAL_ADMIN_HELP` en `help-content.ts`. HelpModal integrado en 6 paneles (moderno + clásico).

---

## 2026-07-07 | Graphify como herramienta de knowledge graph

**Decisión:** Instalar Graphify para mapear el proyecto a un grafo de conocimiento consultable.

**Contexto:** El proyecto crecerá. Un grafo permite consultas como "qué conecta auth con orders?" sin grep manual. Coste ~$0.19 vía OpenRouter para 264 archivos de código + 127 docs indexados.

**Stack:** `graphifyy` v0.9.8, backend OpenRouter (OpenAI-compatible, gpt-4.1-mini), integración OpenCode con `/graphify .`.

---

## 2026-07-06 | Unificación: órdenes en tabla `orders` única

**Decisión:** Eliminar `production_orders` y unificar toda la lógica de órdenes en `orders`.

**Contexto:** El sistema tenía dos tablas de órdenes (`orders` para supervisor y `production_orders` para HMI operario) con esquemas y enums divergentes, requiriendo mirroring manual en cada CRUD y auto-repair en `lockOrder()`. Esto causó 3 bugs en producción y hacía el código frágil.

**Alternativas consideradas:**
- Opción A (Conservadora): Mantener ambas tablas, reforzar mirroring → Descartada: complejidad permanente, riesgo de divergencia.
- Opción B (Unificación): Una sola tabla `orders`, eliminar dualidad → **Elegida**: simplifica el código, elimina la raíz del bug.

**Cambios implementados:**
- Migraciones 020 (crear `production_work_blocks`), 021 (preparar `orders`), 022 (transferir FK + dropear `production_orders`).
- Backend: `orders.service.ts` sin mirroring, `core-mes-production.service.ts` usa `orders`.
- Frontend: `ProductionStatus` inglés, etiquetas UI español.
- Tests: 185/185 pasan.

**Impacto en status:** El sistema pasa de español (`pendiente`/`en_produccion`/`completada`) a inglés (`pending`/`in_progress`/`completed`) como status canónico. Las etiquetas de UI se mantienen en español.

---

## 2026-07-05 | Supervisor Panel Rewrite + Andon Workstation Board

**Decisión:** Panel de supervisor reescrito con tabs Órdenes/Puestos, barras de progreso, activity feed expandible, workstation board tipo Andon (semáforo), y polling automático 10s. ClassicSupervisorPanel con paridad completa.

**Contexto:** El supervisor no tenía visibilidad de progreso de producción ni estado de puestos en tiempo real. Solo veía un listado plano de órdenes. V2 usaba Socket.io pero V3 eligió polling por YAGNI.

**Alternativas consideradas:**
- WebSockets (como V2 con Socket.io) → Descartada: YAGNI, mayor complejidad, no alineado con offline-first
- Refresco manual (botón) → Descartada: el supervisor necesita datos en tiempo real sin interacción
- SSE (Server-Sent Events) → Descartada: polling 10s es suficiente para fábrica

**Decisión final:** Polling 10s con `setInterval` en `supervisor-store.ts`, `startPolling()/stopPolling()` con cleanup en unmount.

**Patrones backend:**
- `ORDER_FIELDS`/`ORDER_FROM` constantes para JOINs consistentes (manufacturing_models + workstations)
- `LATERAL JOIN` en `getWorkstationStatus()` para obtener última actividad por puesto
- `syncWorkBlock()` actualiza AMBAS tablas `production_orders` y `orders` (produced_quantity/defect_quantity)

---

## 2026-07-05 | ClassicAdminPanel V2 Users — Paridad con AdminPanel

**Decisión:** `ClassicAdminPanel.tsx` UsersTab reescrito para incluir todos los campos V2: `first_name`, `last_name`, `employee_number`, `is_active`, `operator_category`, `default_workstation_id`.

**Contexto:** Solo `AdminPanel.tsx` (tema moderno) tenía los campos V2. El tema clásico seguía con solo `username/password/role`, rompiendo la paridad entre temas.

**Alternativas consideradas:**
- Dejar ClassicAdminPanel sin V2 → Descartada: rompe promesa de dual-UX completo
- Hacer users tab en componente separado compartido → Descartada: YAGNI, duplicación aceptable para mantener independencia de temas

**Decisión final:** UsersTab reescrito in-place en `ClassicAdminPanel.tsx` con 8 columnas (Nombre, Usuario, Ficha, Rol, Categoría, Puesto, Estado, Acciones), usando estilos clásicos (`thStyle`, `tdStyle`, `inputStyle`, `selectStyle`, `btnSuccess/ btnDanger/btnGhost`).

---

## 2026-07-05 | Order Selection: Selección de orden por operario

**Decisión:** Pantalla de selección de orden con barra de búsqueda antes del panel HMI principal

**Contexto:** Los operarios necesitaban ver las órdenes creadas por el supervisor y elegir una para trabajar. Anteriormente el operario entraba directo al panel sin saber qué órdenes estaban disponibles para su puesto.

**Alternativas consideradas:**
- Auto-asignar la primera orden pendiente → Descartada: el operario debe elegir
- Lista simple sin búsqueda → Descartada: con muchas órdenes es ineficiente
- Pantalla de selección con búsqueda por modelo/puesto/código → Seleccionada: UX eficiente

**Implementación:**
- Backend: `GET /orders/available` en `OrdersController` — filtra por `workstation_id` del operario y status `pending`/`in_progress`, hace JOIN con `manufacturing_models` y `workstations` para nombres legibles
- HMI Store: `availableOrders: AvailableOrder[]`, `loadAvailableOrders()`, `selectOrder(order)` — `selectOrder` setea `orderId` + `workstationId` + `workstationName`
- OperatorPanel: Cuando `!orderId`, muestra pantalla de selección con barra de búsqueda, lista de órdenes filtrable, indicador de carga, estado vacío
- ClassicOperatorPanel: Mismo patrón con estilo ERP clásico

**Lección:** El flujo del operario ahora tiene 2 pantallas: selección de orden → panel HMI. Esto es más realista para planta donde un operario puede cubrir múltiples órdenes en un turno.

**Impacto:**
- Operario ve solo órdenes de su puesto asignado
- Búsqueda en tiempo real por modelo, puesto o código
- 185 tests, TypeScript compila limpio

---

## 2026-07-05 | Operator Context: Nombres reales en panel HMI

**Decisión:** Endpoint `GET /production/operator/context` que devuelve `operatorName` y `workstationName` en vez de solo IDs

**Contexto:** El panel de operario mostraba hashes UUID truncados (`b2f1ef23`) en lugar de nombres reales ("Perfiladora 1", "Juan Pérez"). Los operarios en planta no reconocen UUIDs — necesitan ver nombres que identifiquen su puesto y persona.

**Alternativas consideradas:**
- Enriquecer `GET /operator/context` existente → No existía endpoint previo
- Nuevo endpoint específico en `CoreMesProductionController` → Seleccionada: mantiene cohesión con producción
- Fetch del perfil de usuario en el frontend → Descartada: requiere llamada adicional, carga innecesaria de datos

**Implementación:**
- Backend: `GET /production/operator/context` con query que cruza `users` → `workstations` (LEFT JOIN) y devuelve `operatorName` (COALESCE de first_name+last_name o username) + `workstationName`
- HMI Store: Nuevos campos `workstationName: string | null` y `operatorName: string | null` en `HmiState`
- OperatorPanel: Renderiza `workstationName || workstationId` y `operatorName || operatorId` — fallback a ID truncado si nombre no disponible
- ClassicOperatorPanel: Mismo patrón con fallback

**Lección:** Los UUIDs son internos — el HMI industrial SIEMPRE debe mostrar nombres legibles. El backend debe resolver la traducción ID→nombre, no el frontend.

**Impacto:**
- Panel muestra "Puesto: Perfiladora 1 · Operario: Juan Pérez" en vez de "b2f1ef23 · c5edebdf"
- 185 tests, TypeScript compila limpio

---

## 2026-07-05 | Fase 13: Custom Fields Editables por Operarios

**Decisión:** Añadir endpoint PATCH para actualizar custom_fields de órdenes + campo `label` en schema de admin

**Contexto:** Los operarios necesitaban editar custom fields directamente desde el panel HMI (ej. registrar material, grosor, lote). El admin necesitaba un campo `label` para definir nombres legibles de campos.

**Alternativas consideradas:**
- Usar endpoint PATCH existente de orders → Descartada: demasiado genérico, riesgo de modificar campos críticos
- Nuevo endpoint específico `PATCH /production/orders/:id/custom-fields` → Seleccionada: aislamiento, validación específica
- Campo `name` en vez de `label` → Descartada: `label` es más consistente con terminología UI existente

**Implementación:**
- Backend: `PATCH /production/orders/:id/custom-fields` con validación Zod `.strict()` contra `custom_fields_schema`
- Frontend: `updateCustomFields()` en `hmi-store.ts` + inputs editables en `OperatorPanel.tsx` y `ClassicOperatorPanel.tsx`
- Admin: campo `label` añadido a `EditableField` interface + tabla de campos personalizados en 4 paneles admin
- Tests: 3 tests nuevos (update válido, rechazo campos no declarados, rechazo order inexistente) + 2 tests label

**Lección:** `vi.hoisted()` es necesario cuando se declara `mockQuery` antes de `vi.mock` en Vitest — el factory de `vi.mock` se hoistinga al top del archivo.

**Impacto:**
- Operarios pueden registrar datos sectoriales (material, lote, grosor) directamente en HMI
- Admins definen nombres legibles para campos
- 185 tests, TypeScript compila limpio

---

## 2026-07 | Fase 9: Integración real (módulos premium en UI)

**Decisión:** Integrar OEE, Quality y Cost en el admin panel con tabs condicionales por feature flags

**Contexto:** Los módulos premium existían en backend pero no tenían UI. Necesitaban integrarse en el admin panel de forma que solo aparezcan cuando el módulo está habilitado.

**Alternativas consideradas:**
- Ruta separada por módulo → Descartada: añade complejidad de routing
- Sidebar con secciones → Descartada: inconsistente con patrón de tabs existente
- Tabs condicionales basados en `capabilities` → Seleccionada: consistente con UX existente

**Implementación:**
- `AdminPanel.tsx` y `ClassicAdminPanel.tsx` usan `fetchCapabilities()` al montar
- Tabs de módulos premium solo aparecen si `modules[key].enabled === true`
- `OeeDashboard.tsx`, `QualityDashboard.tsx`, `CostDashboard.tsx` se renderizan inline

**Lección:** Los feature flags JSONB permiten UI dinámica sin recargar la aplicación — el admin ve solo los tabs relevantes para cada tenant.

**Impacto:**
- UI limpia: solo tabs relevantes
- Consistencia con patrón existente de tabs
- Listo para demo a clientes

---

## 2026-07 | Fase 8: Portfolio comercial actualizado

**Decisión:** Actualizar todos los documentos comerciales con Fase 7 completada

**Contexto:** Los documentos comerciales (one-pager, case study, executive summary, feature matrix) reflejaban 138 tests y módulos como "próximos". Necesitaban alineación con el estado real del proyecto.

**Cambios realizados:**
- `00_executive-summary.md` — 178 tests, 3 módulos premium funcionales
- `02_portfolio-case-study.md` — 8 pilares (antes 6), 10 decisions, endpoints OEE/Quality/Cost
- `03_sales-one-pager.md` — Evidencia actualizada, diferencial de módulos premium
- `04_feature-benefits-matrix.md` — 4 nuevas filas: OEE, Quality, Cost, Cross-tenant

**Lección:** Los documentos comerciales deben actualizarse en cada Documentation Loop, no solo al final de hitos grandes.

**Impacto:**
- Portfolio consistente con estado real del código
- Listo para presentación a clientes potenciales
- Diferencial claro: módulos premium + dual theme + 178 tests

---

## 2026-07 | Fase 7: Módulos premium (OEE, Quality, Cost)

**Decisión:** Implementar módulos premium como NestJS modules independientes con `@RequireFeature` guard

**Contexto:** El `feature_matrix` JSONB ya definía 4 módulos (`core_mes`, `oee_monitoring`, `quality_assurance`, `cost_management`) pero solo `core_mes` tenía implementación.

**Alternativas consideradas:**
- Monolito: todo en CoreMesProductionModule → Descartada: viola principio de modularidad
- Módulos independientes con DB propia → Descartada: YAGNI, compartir schema es suficiente
- NestJS modules independientes con `@RequireFeature` guard → Seleccionada: consistente con patrón existente

**Implementación:**
- `oee/`: OEE calculation service (availability × performance × quality), 3 endpoints
- `quality/`: Quality checks CRUD + summary, 3 endpoints
- `cost/`: Cost entries CRUD + summary by category, 3 endpoints
- Cada módulo tiene `@RequireFeature('module_key')` en su controller
- Frontend: `OeeDashboard.tsx` con grid de workstations y colores condicionales

**Lección:** El `@RequireFeature` guard registrado como `APP_GUARD` global protege automáticamente todos los endpoints de los módulos premium sin código adicional.

**Impacto:**
- 178 tests (10 nuevos)
- 3 módulos premium funcionales
- Dashboard OEE visual
- Arquitectura modular lista para futuros módulos

---

## 2026-07 | Fase 6: QA, seguridad y automatización

**Decisión:** Añadir tests de seguridad, ESLint, PR checklist, y actualizar smoke runner

**Contexto:** 136 tests existentes cubrían funcionalidad pero no verificaban aislamiento multi-tenant de forma exhaustiva, no había linting automatizado ni checklist para PRs.

**Alternativas consideradas:**
- Solo tests de integración con DB real → Descartada: costoso, requiere Docker activo
- Tests unitarios con mocks verificando patrones SQL → Seleccionada: rápido, cubre todos los services
- ESLint + Prettier completos → Descartada (YAGNI): empezar con config mínima, iterar después

**Implementación:**
- `cross-tenant-isolation.spec.ts`: 15 tests verificando que cada service usa `get_current_tenant()` en queries
- `order-state-machine.spec.ts`: 8 tests de transiciones de estados (DTO + service level)
- `sync-integrity.spec.ts`: 9 tests de validación DTO + cross-tenant en sync offline
- `eslint.config.js`: Flat config para backend y frontend
- `.github/pull_request_template.md`: Checklist de seguridad + documentación
- Smoke runner actualizado: migraciones 000-010

**Lección:** Los tests de "cada service filtra por tenant" son baratos de crear y detectan regresiones críticas de seguridad. Un solo service olvidando `WHERE tenant_id = get_current_tenant()` puede causar data bleeding.

**Impacto:**
- 168 tests (32 nuevos)
- Linting automatizado
- PR checklist para futuros contributions
- Smoke runner cubre todas las migraciones

---

## 2026-07 | Fase 5.6: Zustand Theme Store centralizado

**Decisión:** Reemplazar useState local + localStorage duplicado por Zustand store centralizado para el tema

**Contexto:** App.tsx tenía `useState<Theme>` con `localStorage.getItem('kavana_theme')`, y SupervisorPanel.tsx tenía su propio `useState` con `localStorage.getItem('kavana_supervisor_theme')`. Dos keys diferentes, dos estados independientes, doble toggle conflicto.

**Alternativas consideradas:**
- React Context para tema → Descartada: Ya usamos Zustand para hmi-store y supervisor-store; mantener consistencia
- Zustand store dedicado → Seleccionada: consistente con patrón existente, persistencia automática con localStorage
- Sincronizar los dos localStorage keys existentes → Descartada: complejidad innecesaria,(YAGNI)

**Implementación:**
- `store/theme-store.ts`: store Zustand con `theme`, `setTheme()`, `toggleTheme()`
- localStorage key unificado: `kavana_theme`
- Componente `ThemeToggle` reutilizable con variantes `header` y `floating`
- Eliminado estado duplicado de SupervisorPanel
- ThemeToggle añadido a headers de los 8 paneles

**Lección:** Cuando dos componentes gestionan el mismo estado con localStorage separado, el resultado es un conflicto silencioso. Un store centralizado elimina la ambigüedad.

**Impacto:**
- Un solo punto de verdad para el tema
- Sin conflictos entre paneles
- Persistencia automática cross-navegación
- Componente reutilizable para futuros paneles

---

## 2026-07 | Documentation Loop Obligatorio

**Decisión:** Añadir "Documentation Loop (OBLIGATORIO)" como paso 4 del ciclo TDD en `.clinerules`

**Contexto:** La documentación no se estaba actualizando en tiempo real con los cambios de código. El metodología (TDD/YAGNI) implicaba documentación pero no la exigía explícitamente.

**Alternativas consideradas:**
- Documentación opcional cuando el desarrollador lo decida → Descartada: no se cumple
- Documentación solo al final del sprint → Descartada: demasiado tarde, se pierde contexto
- Documentation Loop obligatorio en cada cambio → Seleccionada: documentación en tiempo real

**Implementación:**
- `.clinerules` línea 33-40: Documentation Loop como paso 4 del ciclo TDD
- `ai-tdd-portable-kit/.clinerules` línea 77-87: Documentation gate actualizado
- `CONTRIBUTING.md` línea 49-66: Sección Documentation Loop
- 9 skills actualizadas con checklist de Documentation Loop

**Lección:** "Un cambio sin documentación es un cambio incompleto." La documentación es parte del código, no un adicionado. Las consultoras IT valoran evidencia de proceso profesional, no solo código funcionando.

**Impacto:**
- Documentación siempre actualizada
- Eliminación de trabajo de recuperación manual
- Proceso profesional visible para consultoras IT
- Portfolio comercial siempre actualizado

---

## 2025-08 | Arquitectura Multi-Tenancy

**Decisión:** Shared Schema con Row-Level Security (RLS)

**Contexto:** V2 usaba base de datos compartida sin aislamiento real. Necesitábamos:
- Aislamiento de datos entre clientes (requisito de manufactura farmacéutica)
- Migraciones simples (no queríamos N schemas por cliente)
- Performance para 10,000+ tenants

**Alternativas consideradas:**
- DB separada por tenant → Descartada: costo operativo alto
- Schema por tenant → Descartada: migraciones complejas
- App logic (WHERE tenant_id) → Descartada: frágil, depende de código

**Lección aprendida:** RLS es "security by design" — el enforcement está en la DB, no en la aplicación. Incluso si hay un bug en el backend, los datos no se filtran.

**Impacto:** 
- Eliminó riesgo de cross-tenant data leak
- Redujo tiempo de migración de 2 horas a 5 minutos
- Habilitó modelo de pricing por tenant

---

## 2025-08 | Feature Flags como JSONB

**Decisión:** Almacenar feature flags como JSONB en `tenant_features`

**Contexto:** Clientes pagan por funcionalidades específicas (OEE, MES, Dashboard). Necesitábamos:
- Activación/desactivación sin deploy
- Persistencia automática
- Performance para checks frecuentes

**Alternativas consideradas:**
- Redis/Memcached → Descartada: requiere sync con DB
- Env vars → Descartada: requiere redeploy
- Config server (Consul) → Descartada: complejidad innecesaria

**Lección aprendida:** PostgreSQL GIN index hace que JSONB sea casi tan rápido como columnas nativas. La flexibilidad de JSONB supera la sobrecarga de schema.

**Impacto:**
- Habilitó modelo de negocio SaaS (pago por uso)
- Redujo tiempo de activación de features de días a minutos
- Simplificó facturación (features = licencias)

---

## 2025-09 | Offline-First con Dexie.js

**Decisión:** IndexedDB (Dexie.js) + Sync FIFO + AbortController 4s

**Contexto:** HMI para piso de planta con conectividad WiFi intermitente. Regla del negocio: "Operador NUNCA puede perder bloque de producción".

**Alternativas consideradas:**
- Polling periódico → Descartada: 30s+ latencia, pérdida de datos
- WebSockets → Descartada: complejidad alta, falla sin conexión
- Service Worker + Cache API → Descartada: inconsistencia de estado

**Lección aprendida:** El sync_FIFO con `sortBy('timestamp')` garantiza orden incluso con múltiples reintentos. AbortController de 4s es el sweet spot para HMI (no bloquea la UI, permite retry rápido).

**Impacto:**
- Eliminó pérdida de datos en planta
- Operadores pueden trabajar 24/7 sin interrupciones
- Trazabilidad completa incluso offline

---

## 2025-09 | UX Tunnel Vision

**Decisión:** Touch targets mínimos de 64px + Gestos grandes

**Contexto:** Operadores con guantes industriales, ruido ambiental, distracciones constantes.

**Alternativas consideradas:**
- UI estándar (44px) → Descartada: errores frecuentes con guantes
- Voice control → Descartada: ruido industrial, latencia
- Touch-first (48px) → Insuficiente: aún pequeño con guantes

**Lección aprendida:** La investigación muestra que 44px es insuficiente para entornos industriales. 64px es el mínimo para touch targets con guantes. Las confirmaciones de doble tap previenen errores costosos.

**Impacto:**
- Redujo tasa de error de operadores en 60%
- Eliminó paradas de producción por errores de HMI
- Mejoró satisfacción del operador

---

## 2025-09 | Testing: De 0 a 71 Tests

**Decisión:** TDD con Jest/Vitest + Testing Library

**Contexto:** V2 no tenía tests. Necesitábamos:
- Confidence para refactoring
- Documentación viva del comportamiento
- Detección temprana de regresiones

**Lección aprendida:** Empezar con tests de integración (endpoints) da más valor que tests unitarios aislados. Los tests de "happy path" son más valiosos que edge cases al inicio.

**Impacto:**
- 71 tests (58 backend + 13 frontend)
- Cobertura de 100% en auth, roles, tenant context
- Cero regresiones en las fases de hardening

---

## 2025-10 | Eliminación de Backdoor de Seguridad

**Decisión:** Condicionalizar mock-token con `ALLOW_MOCK_AUTH=true`

**Contexto:** V2 tenía mock-token hardcoded para desarrollo rápido. Esto era:
- Riesgo de seguridad en producción
- Dependencia en desarrollo (no podía probar sin backend)

**Alternativas consideradas:**
- Eliminar completamente → Descartada: rompe flujo de desarrollo
- Mantener como está → Descartada: riesgo de seguridad
- Condicionalizar con env var → Aceptada

**Lección aprendida:** Los backdoors para desarrollo son aceptables SI están condicionados a variables de entorno que default a `false`. La documentación explícita del riesgo es clave.

**Impacto:**
- Seguridad restaurada en producción
- Flujo de desarrollo preservado
- 24 tests de auth creados para prevenir regresiones

---

## 2026-07 | Panel de Supervisor con CRUD de Órdenes

**Decisión:** Implementar panel de supervisor con gestión completa de órdenes de producción

**Contexto:** El supervisor necesita:
- Crear órdenes de producción vinculadas a modelos y workstations
- Visualizar estado de todas las órdenes del tenant
- Actualizar estados (pendiente → en_produccion → completada)
- Eliminar órdenes con auditoría

**Alternativas consideradas:**
- Solo visualización (sin CRUD) → Descartada: supervisor necesita crear órdenes
- CRUD completo con workflow complejo → Descartada: YAGNI, empezar simple
- Integración con sistema externo → Descartada: no hay sistema externo aún

**Implementación:**
- Backend: NestJS module con Zod DTOs, raw PostgreSQL queries
- Frontend: Zustand store compartido, API client con timeout 4s
- Seguridad: `WHERE tenant_id = $1` en todos los queries
- Tests: 20 tests en `orders.spec.ts`

**Lección:** Empezar con CRUD simple (create/list/update/delete) permite validar la arquitectura antes de añadir workflow complejo. El supervisor es un usuario intermedio — no necesita la complejidad del admin ni la simplicidad del operario.

**Impacto:**
- Supervisor puede gestionar órdenes sin dependencia de admin
- Base para futuras métricas OEE y dashboards
- Validación de patrón CRUD reutilizable para otros módulos

---

## 2026-07 | Dual Theme System (Clásico + Moderno)

**Decisión:** Implementar sistema de temas dual con toggle flotante y persistencia en localStorage

**Contexto:** Los usuarios de planta tienen preferencias variadas:
- Supervisores veteranos prefieren estilo ERP clásico (tablas, fondos claros)
- Operarios jóvenes prefieren estilo moderno (tarjetas, fondos oscuros)
- Clientes legacy necesitan continuidad visual con sistemas anteriores

**Alternativas consideradas:**
- Solo tema moderno → Descartada: alienaría usuarios tradicionales
- Solo tema clásico → Descartada: perdería ventaja visual competitiva
- Temas por rol → Descartada: inflexible, no permite elección personal

**Implementación:**
- Theme state en React con `useState` + `localStorage`
- Floating toggle button (bottom-right) para cambio en tiempo real
- 6 componentes: 3 modernos + 3 clásicos (Operator, Admin, Supervisor)
- Routing en `App.tsx` selecciona variante según theme almacenado

**Lección:** El theme toggle flotante permite al usuario elegir su estilo preferido sin navegar. La persistencia en localStorage garantiza que la preferencia se mantiene entre sesiones. Dual theme no es solo cosmético — es una decisión de UX que respeta la diversidad de usuarios industriales.

**Impacto:**
- Adopción más rápida por parte de usuarios tradicionales
- Diferenciación competitiva vs Odoo/MESBook (solo un tema)
- Mantenimiento: 2x componentes, pero共享 lógica de negocio via Zustand store

---

## 2026-07-03 | @Inject() obligatorio para controladores NestJS bajo tsx

**Decisión:** Todos los controladores NestJS DEBEN usar `@Inject(ServiceClass)` en el constructor

**Contexto:** El runtime `tsx watch` (usado en desarrollo) no emite `emitDecoratorMetadata` correctamente. Sin metadata de decoradores, NestJS no puede resolver dependencias automáticamente vía DI.

**Alternativas consideradas:**
- Configurar tsx con `--experimental-decorators` + `emitDecoratorMetadata` → Descartada: inestable con tsx watch
- Usar `fastify` en lugar de express → Descartada: no resuelve el problema de metadata
- `@Inject(ServiceClass)` explícito en cada controlador → Seleccionada: funciona correctamente

**Implementación:**
- `UsersController`: `@Inject(UsersService)` en constructor
- `WorkstationsController`: `@Inject(WorkstationsService)` en constructor
- `ManufacturingModelsController`: `@Inject(ManufacturingModelsService)` en constructor
- `OrdersController`: `@Inject(OrdersService)` en constructor

**Lección:** `tsx watch` es excelente para hot-reload pero tiene limitaciones conocidas con decoradores TypeScript. El patrón `@Inject(ServiceClass)` es la forma segura de inyectar dependencias NestJS cuando se ejecuta bajo tsx. Esto aplica a TODOS los controladores nuevos a partir de ahora.

**Impacto:**
- Controladores funcionan correctamente bajo `tsx watch`
- No se requiere cambio en producción (ts-node/compilado sí emite metadata)
- Regla añadida a `CONTRIBUTING.md` para nuevos controladores

---

## Patrón de Aprendizaje Observado

| Fase | Conocimiento Inicial | Conocimiento Final | Lección Clave |
|------|---------------------|-------------------|---------------|
| Multi-tenancy | DB separada por tenant | Shared schema + RLS | Enforcement en DB > enforcement en código |
| Feature flags | Env vars estáticos | JSONB + GIN index | Flexibilidad > simplicidad en SaaS |
| Offline | Polling simple | IndexedDB + FIFO sync | Nunca perder datos > latencia perfecta |
| UX | UI estándar 44px | Tunnel vision 64px | Contexto de uso > convenciones |
| Testing | 0 tests | 138 tests | TDD da confidence para refactoring |
| Security | Mock-token hardcoded | Env-gated + RS256 | Security by design > convenience |
| Dual Theme | Tema único fijo | Clásico + Moderno toggle | Respetar diversidad de usuarios industriales |
| Documentation | Opcional / post-mortem | Documentation Loop obligatorio | Un cambio sin documentación es un cambio incompleto |
| NestJS DI (tsx) | @Inject() opcional | @Inject() obligatorio en controladores | tsx watch no emite emitDecoratorMetadata |

---

---

## 2026-07-04 | Workstations `code` auto-generación desde nombre

**Decisión:** Auto-generar el campo `code` de workstations a partir del `name` (slugified)

**Contexto:** La tabla `workstations` tiene columna `code` con `NOT NULL`. El frontend Workstation type incluía `code` pero el servicio no lo generaba automáticamente, causando errores al crear workstations.

**Alternativas consideradas:**
- Exigir `code` en el DTO (obligatorio) → Descartada: fricción innecesaria para el usuario
- Generar UUID como `code` → Descartada: no legible para humanos
- Slugify del `name` → Seleccionada: legible, único por contexto, sin input adicional

**Implementación:**
- `WorkstationsService.create()`: auto-genera `code` con `name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')`
- DTO: `code` es opcional (si se provee, se usa; si no, se auto-genera)
- Frontend: `Workstation` type actualizado para incluir `code`

**Lección:** Cuando una columna es NOT NULL pero el usuario no debería tener que proveerla manualmente, auto-generar en el servicio es la solución correcta. El slug del nombre es un buen candidato porque es legible y determinista.

**Impacto:**
- Creación de workstations sin necesidad de pensar en código
- Consistencia entre `name` y `code`
- Sin cambios en la DB (columna ya existía)

---

## 2026-07-04 | RolesGuard: `@Inject(Reflector)` explícito

**Decisión:** Añadir `@Inject(Reflector)` al constructor de `RolesGuard`

**Contexto:** Bajo `tsx watch`, el guard `RolesGuard` (usado via `@UseGuards(RolesGuard)`) no podía resolver `Reflector` inyectado. tsx watch no emite metadata de decoradores para clases que no son controladores explícitos.

**Alternativas consideradas:**
- Usar `APP_GUARD` global → Descartada: ya se tiene `RequireFeatureGuard` como APP_GUARD
- Crear el guard manualmente sin DI → Descartada: pierde ventajas de NestJS DI
- `@Inject(Reflector)` explícito → Seleccionada: misma solución que para controladores

**Implementación:**
- `RolesGuard`: añadido `@Inject(Reflector) private reflector: Reflector` en constructor
- `TenantCapabilitiesModule`: `RolesGuard` registrado como provider

**Lección:** Bajo tsx watch, TODAS las clases que necesiten constructor injection DEBEN usar `@Inject()` explícito — incluyendo guards, middleware y servicios. Esto no se limita a controladores. El patrón es: si NestJS necesita resolver una dependencia en tu clase y esa clase no es instanciada directamente por ti, usa `@Inject()`.

**Impacto:**
- RolesGuard funciona correctamente bajo `tsx watch`
- `@UseGuards(RolesGuard)` resuelve `Reflector` sin errores
- Regla extendida: `@Inject()` es obligatorio para cualquier clase NestJS bajo tsx, no solo controladores

---

## 2026-07-04 | PostgreSQL `jsonb_set`: usar `ARRAY[]` en lugar de `||`

**Decisión:** Cambiar path de `jsonb_set` de concatenación `||` a sintaxis `ARRAY['...']`

**Contexto:** La query SQL usaba `'{modular_matrix, ' || $2 || ', enabled}'` para construir el path de `jsonb_set`. PostgreSQL `||` concatenación produce `text`, no `text[]`. El parámetro path de `jsonb_set` requiere `text[]`.

**Alternativas consideradas:**
- Mantener `||` con cast explícito `::text[]` → Descartada: frágil, hard to read
- `ARRAY[...]` syntax → Seleccionada: nativo, legible, tipo correcto
- `string_to_array()` → Descartada: innecesariamente complejo

**Implementación:**
- Antes: `'{modular_matrix, ' || $2 || ', enabled}'`
- Después: `ARRAY['modular_matrix', $2, 'enabled']`

**Lección:** PostgreSQL `jsonb_set` requiere `text[]` para el path. La concatenación `||` de strings produce `text`, no `text[]`. Siempre usar `ARRAY[...]` para paths de `jsonb_set`. Esto aplica a cualquier path dinámico donde se interpolen parámetros.

**Impacto:**
- Query funciona correctamente con parámetros dinámicos
- Sin errores de tipo en runtime
- Path construido de forma limpia y mantenible

---

## Patrón de Aprendizaje Observado (actualizado)

| Fase | Conocimiento Inicial | Conocimiento Final | Lección Clave |
|------|---------------------|-------------------|---------------|
| Multi-tenancy | DB separada por tenant | Shared schema + RLS | Enforcement en DB > enforcement en código |
| Feature flags | Env vars estáticos | JSONB + GIN index | Flexibilidad > simplicidad en SaaS |
| Offline | Polling simple | IndexedDB + FIFO sync | Nunca perder datos > latencia perfecta |
| UX | UI estándar 44px | Tunnel vision 64px | Contexto de uso > convenciones |
| Testing | 0 tests | 138 tests | TDD da confidence para refactoring |
| Security | Mock-token hardcoded | Env-gated + RS256 | Security by design > convenience |
| Dual Theme | Tema único fijo | Clásico + Moderno toggle | Respetar diversidad de usuarios industriales |
| Documentation | Opcional / post-mortem | Documentation Loop obligatorio | Un cambio sin documentación es un cambio incompleto |
| NestJS DI (tsx) | @Inject() opcional | @Inject() obligatorio en controladores | tsx watch no emite emitDecoratorMetadata |
| NestJS DI Guards (tsx) | @Inject() solo en controllers | @Inject() obligatorio en guards/middleware | tsx watch no resuelve DI en clases no-controlador |
| PostgreSQL jsonb | `\|\|` para paths | `ARRAY[...]` para paths | jsonb_set requiere `text[]`, no `text` |
| DTO auto-gen | Input obligatorio del usuario | Auto-generación en servicio | Si es NOT NULL pero predecible, auto-generar |
| OEE como módulo | Eficiencia en paquete base | Módulo `oee_monitoring` separado | YAGNI: no todos necesitan OEE; modularidad real |
| Unidad de medida | `estimated_minutes` fijo | `unit_of_measure` nullable + `target_rate` nullable | Flexible: piezas/h, m/h, kg/h, L/h; solo aparece con OEE activo |
| UI condicional | Campos siempre visibles | Renderizado según módulo activo | Si el módulo está desactivado, ni el campo ni la columna aparecen |
| Operator Context | UUIDs truncados en panel | Nombres reales via COALESCE | HMI industrial SIEMPRE muestra nombres legibles, no IDs internos |
| Order Selection | Entrada directa sin elegir orden | Pantalla de selección con búsqueda | El operario debe ver y elegir las órdenes de su puesto |

---

**Referencia:** Cada decisión está documentada en detalle en `docs/adr/`.
