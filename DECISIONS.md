# Decisiones técnicas — KAVANA MANUFACTURING

Este documento consolida las decisiones de arquitectura e ingeniería del proyecto.
Cada decisión tiene su ADR cuando es de arquitectura, o su entrada aquí cuando es
de implementación. Git describe qué cambió; este documento explica por qué.

- **ADRs**: [`docs/adr/`](docs/adr/) (formales, con alternativas y consecuencias)
- **Decisions log**: [`docs/decisions-log.md`](docs/decisions-log.md) (evolución por fecha)
- **Decisiones estratégicas ampliadas**: [`DECISIONES_ESTRATEGICAS.md`](DECISIONES_ESTRATEGICAS.md)

---

## ADRs (formales)

| # | Decisión | Archivo |
|---|----------|---------|
| 001 | Multi-tenancy con shared schema + Row-Level Security | [`docs/adr/001-shared-schema-multi-tenant-rls.md`](docs/adr/001-shared-schema-multi-tenant-rls.md) |
| 002 | Feature flags por tenant en JSONB | [`docs/adr/002-feature-flags-jsonb.md`](docs/adr/002-feature-flags-jsonb.md) |
| 003 | Offline-first con Dexie/IndexedDB + outbox | [`docs/adr/003-offline-first-dexie.md`](docs/adr/003-offline-first-dexie.md) |
| 004 | UX Tunnel Vision (pantallas industriales, manos con guantes) | [`docs/adr/004-ux-tunnel-vision.md`](docs/adr/004-ux-tunnel-vision.md) |
| 005 | Toolings: estimación preventiva de vida útil (no tracking sin hardware) | [`docs/adr/005-toolings-estimacion-preventiva.md`](docs/adr/005-toolings-estimacion-preventiva.md) |

## Decisiones de implementación (resumen)

### 1. Bloques de trabajo retrospectivos en vez de máquina de estados en tiempo real
Los operarios no interactúan con el sistema en tiempo real. Registrar a posteriori
rompía la lógica FIFO de la máquina de estados. Se adoptaron `work_blocks`
(`start_time`, `end_time`, producción, mermas): registro asíncrono y retrospectivo,
tolerante a retrasos y a múltiples operarios simultáneos. Validación estricta de
solapamiento por operario en el backend.

### 2. RLS enforzado por la base de datos, no solo por el código
Shared schema con `current_setting('app.current_tenant')`. El aislamiento lo
enforza PostgreSQL a nivel de fila: imposible de evadir incluso con SQL raw.
Trade-off: disciplina en el middleware y tests de aislamiento cross-tenant
obligatorios.

### 3. Offline-first real: IndexedDB + outbox, no cache-only
Dexie.js/IndexedDB como base de datos local completa, no un Service Worker que
solo cachea assets. Cada mutación offline genera un evento en cola local (outbox)
que se sincroniza con BullMQ (retry exponencial, dead-letter, idempotency keys).
La UI nunca bloquea por red.

### 4. UX diseñada para la mano, no el ratón
Botones de 64px, contraste alto, poca información por pantalla, flujo lineal.
Pantallas táctiles industriales con manos enguantadas. Si el control es pequeño,
el operario falla y deja de registrar.

### 5. Custom fields renderizados dinámicamente por tenant
El HMI muestra los campos personalizados definidos por el administrador del
tenant (grosor de bobina, color de lacado, etc.) con separación de
responsabilidades: definición en BD, renderizado dinámico en frontend.

### 6. Toolings como estimación, no como tracking
Sin conexión a PLC ni IoT, un tracking en tiempo real no tiene sentido. Se
implementó estimación preventiva de vida útil: `cycles_per_piece × piezas`
acumuladas, configurable por tenant. Honestidad sobre lo que es y lo que no.

---

## Por qué este documento existe

Un reclutador técnico que siga el embudo CV → Landing → GitHub debe encontrar en
el repo la misma historia que cuenta la landing. Cada decisión aquí es verificable
en el código: módulos, migraciones, endpoints y esquema de BD. Si una afirmación
no se puede verificar, no está en este documento.

Números verificados a fecha 2026-08-02: **216 tests backend + 17 tests frontend**
(233, vitest), 17 módulos NestJS, 5 ADRs, 12 tests e2e Playwright.
