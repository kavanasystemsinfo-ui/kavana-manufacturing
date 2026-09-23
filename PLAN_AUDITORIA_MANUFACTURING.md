# Plan de Mejora Manufacturing — Auditoría Formal (2026-09-21)

**Branch**: `chore/audit-improvements`
**Objetivo**: Software completo, simple, mínimo clicks por rol, listo para portfolio técnico
**Arquitectura principal**: NO se toca (multi-tenant RLS, offline-first Dexie, sync engine, roles fail-closed)

---

## Horizonte 1 — CRÍTICO (Semana 1-2)

**Estado (2026-09-23): completado.** Las siete tareas están implementadas y
verificadas; la 1.1 con el flujo completo corriendo contra backend, frontend y base
de datos reales, y añadida como job `e2e` del CI. El propio E2E destapó dos P0 del
registro de producción (ver `docs/KNOWN_ISSUES.md`, ronda 4).

| # | Tarea | Responsable | Criterio de aceptación | Est. |
|---|-------|-------------|------------------------|------|
| 1.1 | ✅ **E2E Playwright smoke**: login → operario registra bloque → supervisor ve completada | Subagente A | Pasa en CI BD efímera | 4h |
| 1.2 | **Fix CI lint cache**: `cache-dependency-path` = hash `package-lock.json` + workflow | Subagente A | 3 runs verdes seguidos | 1h |
| 1.3 | **Formato numérico unificado**: migrar `formatQuantity` → `formatNumber` | Subagente B | 0 `formatQuantity`; build+tests verdes | 2h |
| 1.4 | **Componentes base**: `<Loading/>`, `<EmptyState/>`, `<ErrorState/>`, `<Modal/>` + migrar 3 paneles | Subagente B | 0 duplicados | 3h |
| 1.5 | **Operario: `type="time"` nativo** + validación HTML5 | Subagente B | Parser manual eliminado; tests unit | 1h |
| 1.6 | **Supervisor: Drag&drop Kanban órdenes** (`@dnd-kit/core`) | Subagente C | Cambio estado = drag; 0 botones | 4h |
| 1.7 | **Admin: 12 tabs → 5 grupos colapsables** responsive | Subagente C | 0 scroll horizontal móvil | 2h |

---

## Horizonte 2 — IMPORTANTE (Semana 3-4)

| # | Tarea | Responsable | Criterio de aceptación | Est. |
|---|-------|-------------|------------------------|------|
| 2.1 | **Operario: "Repetir último bloque"** (pre-rellena fin=ahora, cant=última) | Subagente | 1 click → listo submit | 2h |
| 2.2 | **Operario: "Mi turno hoy"** KPI (horas netas, buenas, defectos, % OEE) | Subagente | Card superior con datos día | 3h |
| 2.3 | **Supervisor: Workstations real-time** (polling 30s / WS) | Subagente | Badge verde/amarillo/rojo auto | 3h |
| 2.4 | **Supervisor: Kanban incidencias** (Abierto→En Progreso→Resuelto→Cerrado) | Subagente | Drag&drop persiste + notifica | 4h |
| 2.5 | **Admin: Custom Fields Builder visual** (drag: texto, número, select, boolean, fecha) | Subagente | JSON schema válido; 0 JSON a mano | 5h |
| 2.6 | **Selector periodo global** (hoy/semana/mes/custom) + URL + localStorage | Orquestador | Dashboards reaccionan; shareable | 3h |
| 2.7 | **Auditoría visible Admin** (tab: quién, qué, cuándo, IP) | Subagente | Lee `tenant_config_audit` + triggers | 4h |
| 2.8 | **Atajo `Cmd/Ctrl+K` → AiAdvisorFab** + `Esc` cierra | Orquestador | Funciona en todos paneles | 1h |
| 2.9 | **Banner offline global** (todos paneles) | Orquestador | Aparece al perder conexión | 1h |

---

## Horizonte 3 — PULIDO (Semana 5+)

| # | Tarea | Responsable | Criterio de aceptación | Est. |
|---|-------|-------------|------------------------|------|
| 3.1 | **Global Admin: Wizard onboarding tenant** (3 pasos) | Subagente | Tenant+módulos+admin <2 min | 4h |
| 3.2 | **Migración `api/v1`** (middleware + frontend + landing) | Orquestador | 0 404 prod; `/api/v1/health` | 4h |
| 3.3 | **Tests frontend ≥100** (stores, hooks, componentes críticos) | Subagente | `npm test` ≥100 `it()`; CI verde | 6h |
| 3.4 | **Contract tests OpenAPI** (spec desde código + validación) | Subagente | `test:contract` verde; `/api/docs` | 4h |
| 3.5 | **Design tokens** (`docs/design-tokens.md` + `tailwind.config.js`) | Orquestador | 0 colores hardcodeados | 2h |
| 3.6 | **ADRs 007-010** + `METRICS.md` + `HISTORY.md` + `SECURITY.md` + `LICENSE` + `.env.example` | Orquestador | Todos en repo; landing sync | 3h |
| 3.7 | **Reactivar Render + Vercel auto** + health check prod | Orquestador | `curl /health` → 200 | 2h |
| 3.8 | **Mutation testing** (Stryker) ≥80% | Subagente | Badge en README | 3h |

---

## Guardrails (obligatorios en cada tarea)

- [ ] Spec ANTES (TDD) → rojo verificado
- [ ] Implementación mínima → verde real (salida suite)
- [ ] Lint + typecheck + build pasan
- [ ] ADR si decisión arquitectura/UX
- [ ] Landing/README si cambian métricas
- [ ] `git status -s` limpio
- [ ] Push feature branch + PR con evidencias

---

## Definición de Completado Global

Todas las tareas de Horizonte 1 completadas y verificadas → PR a `main` con release note.
Horizontes 2 y 3 se planifican tras validar Horizonte 1.