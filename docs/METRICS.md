# 📊 Métricas del Proyecto — Kavana Manufacturing

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
| **Tests** | 17 frontend + 208 backend = **225 tests** |

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

> 📝 Markdown representa un 29% — consecuencia directa de documentar cada decisión con ADRs, documentos técnicos y comerciales. Es intencional, no ruido.

## Cobertura de Tests

### Frontend (Vitest)
| Archivo | Tests | Estado |
|---------|-------|--------|
| `hmi-store.spec.ts` | 3 | ✅ |
| `local-db.spec.ts` | 2 | ✅ |
| `supervisor-store.spec.ts` | 5 | ✅ |
| `customFieldsMapper.spec.ts` | 4 | ✅ |
| `client.spec.ts` | 3 | ✅ |
| **Total** | **17** | **✅ Todos pasando** |

### Backend (Vitest — documentado)
- **208 tests** en 30 archivos de test
- Cobertura de módulos: auth, orders, OEE, quality, cost, workstations, manufacturing-models, users

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
- **Ratio código/documentación:** ~2:1 (intencional — priorizamos documentación de decisiones)
- **Dependencias backend:** ~40 paquetes (NestJS, pg, BullMQ, OpenTelemetry)
- **Dependencias frontend:** ~30 paquetes (React, Zustand, Dexie, Vitest, Tailwind)

---

*Métricas generadas automáticamente. Actualizadas el 2026-07-23.*
