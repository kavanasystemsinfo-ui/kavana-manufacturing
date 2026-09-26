# 📊 Métricas del Proyecto: Kavana Manufacturing

*Datos reales del repositorio, generados el 2026-07-23.*

---

## Vista General

| Métrica | Valor |
|---------|-------|
| **Archivos de código** | 363 |
| **Líneas de código total** | ~49.447 |
| **Lenguajes** | TypeScript, TSX, SQL, JSON, YAML, MD, Python, Bash |
| **Commits** | +120 (rama `main`) |
| **Tiempo de desarrollo** | ~4 semanas desde refactorización V2 |
| **Tests** | 155 frontend + 409 backend = **564 tests** (+ 9 end-to-end) |

## Cobertura por módulo

| Módulo | Tests | Qué cubren |
|--------|-------|------------|
| Auth (JWT, roles, RLS) | 24 | Login multi-tenant, contexto de tenant, guards, expiración |
| Core MES (work blocks) | 32 | Registro offline, sincronización FIFO, validación de solapamiento |
| Orders | 28 | Ciclo de vida de órdenes, filtros por tenant, estados |
| OEE | 18 | Cálculo de efectividad, recálculo asíncrono |
| Quality | 15 | No conformidades, inspecciones, alertas |
| Cost | 12 | Costes de producción, desviaciones |
| Users | 10 | CRUD, roles, permisos por tenant |
| Manufacturing Models | 8 | BOM, modelos, relaciones |
| Frontend (store, sync, UI) | 17 | Estado offline, sincronización, mapeo de campos |
| Otros (toolings, incidencias, materials) | 61 | CRUD, reglas de negocio, feature flags |

## Composición

| Lenguaje | Archivos | Líneas | % del total |
|----------|----------|--------|-------------|
| **TypeScript (.ts)** | 137 | 10.682 | 21.6% |
| **TSX (.tsx)** | 25 | 8.246 | 16.7% |
| **SQL** | 41 | 1.763 | 3.6% |
| **JavaScript (.js/.cjs/.mjs)** | 19 | 866 | 1.8% |
| **Python** | 5 | 3.251 | 6.6% |
| **YAML/JSON** | 22 | 10.097 | 20.3% |
| **Shell/Bash** | 5 | 179 | 0.4% |
| **Markdown (documentación)** | 108 | 14.331 | 29.0% |
| **CSS** | 1 | 32 | 0.1% |

> 📝 Markdown representa un 29%: consecuencia directa de documentar cada decisión con ADRs, documentos técnicos y comerciales. Es intencional, no ruido.

## Cobertura de Tests

Cifras de la última ejecución verificada (2026-09-23). Se actualizan ejecutando
la suite, no contando `it(` con un `grep`.

### Backend (Vitest)
- **409 tests en 47 archivos** (`npm run test` en `backend/`, con `DATABASE_URL`).
- Cubre auth, orders, OEE, quality, cost, workstations, manufacturing-models,
  users, tenant-capabilities, incidencias, materials, toolings, queue, y el
  contrato de roles de **toda** la API (`roles-contract.spec.ts`, el test que
  encontró los endpoints que devolvían 403 a todos los roles).

### Frontend (Vitest)
- **155 tests en 22 archivos** (`npm run test` en `frontend/`): stores, hooks,
  utilidades puras y componentes con Testing Library.

### End-to-end (Playwright)
- **9 tests** (`npm run test:e2e` en `frontend/`): el flujo completo (login del
  operario → registra un parte → el supervisor lo ve), el alta de orden por el
  supervisor, el tablero de incidencias con arrastre real (en el panel del admin y
  en el del supervisor), el aviso al operario sin puesto asignado, el tema moderno,
  el panel de administración y dos de smoke. Corren contra el backend y el frontend
  reales, con base de datos efímera.

## Desglose por Módulo (Backend)

| Módulo | Propósito | Archivos |
|--------|-----------|----------|
| `auth/` | JWT, roles, guards, tenant context | 12 |
| `core-mes-production/` | Work blocks, producción en planta | 8 |
| `orders/` | Órdenes de fabricación | 6 |
| `workstations/` | Puestos de trabajo | 4 |
| `manufacturing-models/` | Modelos, BOM | 4 |
| `oee/` | Overall Equipment Effectiveness | 6 |
| `quality/` | Control de calidad | 5 |
| `cost/` | Costes de producción | 4 |
| `users/` | Gestión de usuarios | 4 |
| `tenant-capabilities/` | Feature flags JSONB | 4 |
| `incidencias/` | Incidencias y no conformidades | 4 |
| `materials/` | Materias primas y BOM | 4 |
| `toolings/` | Utillajes y estimación | 4 |
| `ai-advisor/` | Asistente IA industrial (RAG) | 6 |
| `queue/` | Colas asíncronas BullMQ | 4 |
| `telemetry/` | OpenTelemetry + métricas | 3 |
| `global-admin/` | Administración multi-tenant | 3 |

## Complejidad

- **Tamaño del backend:** ~10.682 líneas TypeScript
- **Tamaño del frontend:** ~8.246 líneas TSX
- **Ratio código/documentación:** ~2:1 (intencional: priorizamos documentación de decisiones)
- **Dependencias backend:** ~40 paquetes (NestJS, pg, BullMQ, OpenTelemetry)
- **Dependencias frontend:** ~30 paquetes (React, Zustand, Dexie, Vitest, Tailwind)

---

*Métricas de composición generadas el 2026-07-23. Las cifras de tests se
verificaron por última vez el 2026-09-23 ejecutando las suites.*
