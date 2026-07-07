# Kavana V3 - Frontend HMI Offline-First

## Estado del documento

- **Estado:** Implementación completada con sistema de temas dual, guías de usuario en OperatorPanel (moderno + clásico), y status unificado en inglés.
- **Última actualización:** 2026-07-07.
- **Fuente maestra:** [`root/06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md`](root/06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md:1).
- **Documentación comercial relacionada:** [`docs/commercial/02_portfolio-case-study.md`](docs/commercial/02_portfolio-case-study.md:1).

## Objetivo

Definir y documentar la arquitectura frontend para el HMI de operario: táctil, offline-first, resiliente, con identidad visual corporativa y de baja carga cognitiva. Incluye sistema de temas dual para soportar tanto el estilo ERP clásico (tablas, fondos claros) como el estilo moderno Kavana (tarjetas, fondos oscuros).

## Estándar HMI obligatorio

- Visión de túnel.
- Una acción principal por pantalla.
- Flujos de 1 o 2 clics.
- Botones mínimos de 64px.
- Sin menús anidados en planta.
- Inmunidad al doble clic mediante bloqueo de mutación.
- Estado crítico persistente en IndexedDB/Dexie.js.
- Cola FIFO de eventos.
- API calls con `AbortController` y timeout de 4s.

## Identidad visual corporativa

La interfaz usa una paleta industrial premium pensada para planta: fondo oscuro para reducir fatiga visual, acento naranja Kavana para acciones principales y grises industriales para superficies secundarias.

| Token Tailwind | Valor | Uso recomendado |
|---|---:|---|
| `kavana.dark` | `#030712` | Fondo principal HMI. |
| `kavana.panel` | `#0B1329` | Tarjetas y contenedores primarios. |
| `kavana.orange` | `#E17A47` | Acción principal, acentos y estado online. |
| `kavana.orange-light` | `#F4A261` | Acento secundario y hover. |
| `kavana.steel` | `#4B5563` | Bordes, etiquetas secundarias y acciones neutras. |
| `kavana.surface` | `#1F2937` | Inputs, badges y superficies de soporte. |

Configuración centralizada en [`frontend/tailwind.config.js`](frontend/tailwind.config.js:1).

## Sistema de Temas Dual

### Decision: Dual Theme (Clásico ERP + Moderno Kavana)

**Fecha:** 2026-07-03

**Contexto:** El panel de administración y supervisión requiere soportar dos estilos visuales:
1. **Clásico ERP** — Tablas, fondos claros, tipografía limpia, bordes sutiles (estilo GTA San Andreas essence)
2. **Moderno Kavana** — Tarjetas, fondos oscuros, gradientes, acentos naranja (estilo GTA 5 graphics)

**Implementación:**
- Theme state persistido en `localStorage` con key `kavana_theme`
- Floating toggle button (bottom-right) para cambio en tiempo real
- Cada panel tiene variante clásica y moderna:
  - `OperatorPanel.tsx` (moderno) + `ClassicOperatorPanel.tsx` (clásico)
  - `TenantAdminPanel.tsx` (moderno) + `ClassicTenantAdminPanel.tsx` (clásico)
  - `SupervisorPanel.tsx` (moderno) + `ClassicSupervisorPanel.tsx` (clásico)
- Routing en `App.tsx` selecciona variante según theme almacenado

**Archivos:**
- [`frontend/src/App.tsx`](frontend/src/App.tsx:1) — Theme state + routing dual
- [`frontend/src/ClassicOperatorPanel.tsx`](frontend/src/ClassicOperatorPanel.tsx:1) — Variante clásica operario
- [`frontend/src/ClassicTenantAdminPanel.tsx`](frontend/src/ClassicTenantAdminPanel.tsx:1) — Variante clásica admin
- [`frontend/src/ClassicSupervisorPanel.tsx`](frontend/src/ClassicSupervisorPanel.tsx:1) — Variante clásica supervisor

**Lección:** El theme toggle flotante permite al usuario elegir su estilo preferido sin navegar. La persistencia en localStorage garantiza que la preferencia se mantiene entre sesiones.

## Implementación actual

La Fase 4 tiene una base ejecutable y comprobada con build:

- Aplicación React/Vite con Tailwind en [`frontend/src/App.tsx`](frontend/src/App.tsx:1).
- Logo corporativo integrado desde [`logo.png`](logo.png:1).
- Cliente API con timeout de 4s en [`frontend/src/api/client.ts`](frontend/src/api/client.ts:1).
- Base local Dexie para cola y dead-letter en [`frontend/src/db/local-db.ts`](frontend/src/db/local-db.ts:1).
- Store Zustand con estado online/offline, mutación y sincronización en [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:1).
- Estilos base y configuración Tailwind en [`frontend/src/styles.css`](frontend/src/styles.css:1).
- Sistema de temas dual con persistencia en localStorage.
- Paleta corporativa Kavana y targets táctiles en [`frontend/tailwind.config.js`](frontend/tailwind.config.js:1).
- Sincronización backend de eventos offline en [`backend/src/core-mes-production/core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:1).
- DTO de sincronización offline en [`backend/src/core-mes-production/dto.ts`](backend/src/core-mes-production/dto.ts:1).
- **Operator Context con nombres reales:** `GET /production/operator/context` devuelve `operatorName` y `workstationName` (no UUIDs). Panel renderiza nombres legibles con fallback a ID truncado.
- **Selección de orden con búsqueda:** `GET /orders/available` devuelve órdenes del puesto. Pantalla de selección con barra de búsqueda, loading spinner y estado vacío. `selectOrder(order)` setea el contexto.

## Flujo offline-first implementado

1. El operario pulsa una acción táctil: iniciar, pausar, reanudar o terminar.
2. El evento se serializa en IndexedDB antes de intentar red.
3. La UI cambia de estado de forma optimista.
4. Si hay red, el sincronizador envía eventos FIFO a `POST /production/time-logs/sync`.
5. Si falla una llamada, el evento pasa a dead-letter para revisión.
6. El backend valida `tenant_id`, idempotencia por `client_event_id`, máquina de estados y motivo de parada antes de confirmar.

## Criterios de aceptación cubiertos

| Criterio | Estado | Evidencia |
|---|---:|---|
| Operario puede iniciar, pausar, reanudar y terminar desde HMI | Cubierto | [`frontend/src/App.tsx`](frontend/src/App.tsx:1) |
| Botones táctiles mínimos de 64px | Cubierto | [`frontend/tailwind.config.js`](frontend/tailwind.config.js:14) |
| Identidad visual corporativa Kavana | Cubierto | [`frontend/tailwind.config.js`](frontend/tailwind.config.js:5) |
| Logo corporativo en HMI | Cubierto | [`frontend/src/App.tsx`](frontend/src/App.tsx:60) |
| Eventos persisten en IndexedDB | Cubierto | [`frontend/src/db/local-db.ts`](frontend/src/db/local-db.ts:20) |
| Sincronización FIFO | Cubierto | [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:99) |
| Dead-letter para fallos | Cubierto | [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:112) |
| API timeout de 4s | Cubierto | [`frontend/src/api/client.ts`](frontend/src/api/client.ts:1) |
| Idempotencia backend por `client_event_id` | Cubierto | [`backend/src/core-mes-production/core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:216) |
| Tests de cola offline | Cubierto | [`frontend/src/db/local-db.spec.ts`](frontend/src/db/local-db.spec.ts:1) |
| Operator context muestra nombres reales (no UUIDs) | Cubierto | [`frontend/src/OperatorPanel.tsx`](frontend/src/OperatorPanel.tsx:207) |
| Pantalla de selección de orden con búsqueda | Cubierto | [`frontend/src/OperatorPanel.tsx`](frontend/src/OperatorPanel.tsx:171) |

## Brechas restantes

| Área | Brecha | Severidad | Estado |
|---|---|---:|---|
| Autenticación | El HMI usa constantes demo de tenant, orden, puesto y operario | Alta | Pendiente |
| Selección de contexto | Falta pantalla real de selección de orden/puesto/operario | Alta | Pendiente |
| Producción | Falta captura de cantidades producidas y defectuosas | Media | Pendiente |
| Resiliencia | Falta Service Worker/PWA shell | Media | Pendiente |
| Pruebas | Faltan pruebas E2E del flujo offline con Playwright/Cypress | Media | Pendiente |
| Backend | Falta endpoint administrativo para crear órdenes/puestos reales | Media | Pendiente |

## Riesgos controlados

- Se evita guardar eventos solo en memoria.
- Se evita duplicidad mediante `client_event_id`.
- Se evita bloqueo de cola moviendo fallos a dead-letter.
- Se evita dependencia inmediata de red.
- Se evita doble clic mediante `isMutating` e `isSyncing`.
- Se evita una paleta improvisada centralizando colores en Tailwind.

## Riesgos pendientes

- Si el usuario recarga antes de que el backend confirme, el estado optimista puede no reflejar el estado real del servidor.
- Si un evento falla por regla de negocio, queda en dead-letter y requiere revisión.
- La demo actual no sustituye autenticación ni selección real de contexto industrial.

## Próximas prioridades técnicas

1. Implementar autenticación mínima y contexto real de usuario.
2. Añadir pantalla de selección de orden/puesto para operario.
3. Añadir captura de cantidades producidas y defectuosas.
4. Añadir Service Worker/PWA shell.
5. Añadir pruebas E2E offline-first.
