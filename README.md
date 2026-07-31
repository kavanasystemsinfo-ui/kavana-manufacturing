# Kavana Manufacturing: Sistema MES SaaS para Manufactura Industrial

**Problema que resuelve:** Las plantas de manufactura pierden tiempo y visibilidad cuando la producción depende de papel, redes inestables y datos que llegan tarde. Los sistemas MES tradicionales son costosos, difíciles de implementar y no funcionan offline.

**Solución:** Kavana Manufacturing es un MES SaaS multi-tenant que ejecuta órdenes de producción en pantallas HMI táctiles, con resiliencia offline-first para que el registro de planta no dependa de la conexión.

---

## Objetivos de diseño

Cada decisión de arquitectura responde a un problema concreto de planta. No son métricas de cliente (el producto aún no tiene implantación en producción), sino el propósito para el que se diseñó cada pieza:

| Objetivo de diseño | Cómo se aborda |
|-------------------|----------------|
| Reducir tiempo de implantación | Arquitectura SaaS multi-tenant: un despliegue sirve a varios clientes |
| Evitar pérdida de datos en planta | Offline-first: el registro se guarda localmente y sincroniza al recuperar red |
| Reducir errores del operario | HMI con botones grandes (64px+) para manos con guantes |
| Aislar los datos de cada cliente | Multi-tenancy con Row Level Security (RLS) en PostgreSQL |
| Reducir coste de entrada | Arquitectura compartida + feature flags (cada cliente activa solo lo que usa) |

---

## 60 Segundos: Cómo Funciona

```
┌─────────────────────────────────────────────────────────────┐
│  OPERADOR EN PLANTA                                         │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │ Orden:      │  │         ▶ INICIAR BLOQUE            │   │
│  │ #12345      │  │         (Botón 80px - con guantes)  │   │
│  │ EnCurso     │  │                                     │   │
│  └─────────────┘  └─────────────────────────────────────┘   │
│                                                             │
│  [Parar] [Pausar] [Siguiente] [Reporte] [Alerta]           │
│   64px    64px     64px        64px       64px              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (offline-first)
                    ┌─────────────────┐
                    │ IndexedDB local │ ← Sync FIFO
                    │ (Dexie.js)      │ ← AbortController 4s
                    └────────┬────────┘
                             │
                             ▼ (cuando hay red)
                    ┌─────────────────┐
                    │ Backend NestJS  │
                    │ PostgreSQL 16   │
                    │ + RLS           │
                    └─────────────────┘
```

---

## Pilares Técnicos (Por Qué Importan para el Negocio)

### 1. Multi-Tenancy con RLS
**Para qué:** Cada cliente tiene datos aislados en la misma base de datos.
**Impacto:** Un bug no afecta a otros clientes. El aislamiento se enforce en la base de datos, no solo en código.
**Decisión:** [ADR-001](docs/adr/001-shared-schema-multi-tenant-rls.md)

### 2. Feature Flags como JSONB
**Para qué:** Clientes pagan solo por funcionalidades que usan (OEE, MES, Dashboard).
**Impacto:** Modelo SaaS escalable. Activación instantánea sin deploy.
**Decisión:** [ADR-002](docs/adr/002-feature-flags-jsonb.md)

### 3. Offline-First con Dexie.js
**Para qué:** Operadores nunca pierden datos aunque se caiga la red.
**Impacto:** El registro de producción se conserva localmente y se sincroniza al recuperar conexión. Cero pérdida por caída de red.
**Decisión:** [ADR-003](docs/adr/003-offline-first-dexie.md)

### 4. UX Tunnel Vision
**Para qué:** Interfaz grande (64px+) para operadores con guantes industriales.
**Impacto:** Menos errores de pulsación y adopción más rápida en planta.
**Decisión:** [ADR-004](docs/adr/004-ux-tunnel-vision.md)

### 5. Dual Theme (Clásico + Moderno)
**Para qué:** Respetar la diversidad de usuarios industriales — supervisores veteranos vs operarios jóvenes.
**Impacto:** Adopción más rápida, menor resistencia al cambio.
**Decisión:** [ decisions-log.md](docs/decisions-log.md)

---

## Stack Tecnológico

| Componente | Tecnología | Por Qué |
|------------|-----------|---------|
| **Frontend** | React + Tailwind | Componentes reutilizables, Tailwind para HMI responsive |
| **Backend** | NestJS | Arquitectura modular, DI, Guards para auth |
| **Base de Datos** | PostgreSQL 16 | RLS nativo, JSONB para features, rendimiento |
| **Estado Local** | Zustand + Dexie.js | Offline-first, sync FIFO |
| **Tests** | Vitest + Testing Library | TDD, 208 tests pasando |

---

## Para Consultoras IT: Lecciones Aprendidas

### Lo que funcionó
1. **RLS > App logic** — Enforcement en DB es más seguro que en código
2. **JSONB para features** — Flexibilidad sin migraciones
3. **TDD estricto** — 208 tests dieron confidence para refactoring agresivo
4. **Env-gated backdoors** — `ALLOW_MOCK_AUTH=true` preservó flujo de dev

### Lo que no funcionó
1. **Schema-per-tenant** — Complejidad de migraciones inmanejable
2. **WebSockets para offline** — Falla sin conexión
3. **UI estándar 44px** — Insuficiente con guantes industriales
4. **Testing post-hoc** — Difícil agregar tests después del código

### Recomendaciones para futuros proyectos
1. **Empezar con RLS** — No es opcional en SaaS multi-tenant
2. **Offline-first desde día 1** — No se puede agregar después
3. **UX contextual** — Investigar condiciones reales de uso (guantes, ruido)
4. **TDD desde el inicio** — El ROI es exponencial

---

## Cómo Ejecutar

```bash
# Backend
cd backend
npm install
npm run dev    # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev    # http://localhost:5173

# Docker (stack completo: DB + Redis + backend + worker)
docker compose up -d

# Docker + observabilidad (Prometheus + Grafana)
METRICS_PORT=9464 docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d

# Tests
npm run test   # 208 tests pasando
```

---

## Estructura del Proyecto

```
kavana-v3/
├── backend/                    # NestJS API (13 módulos)
│   ├── src/
│   │   ├── auth/              # JWT, roles, tenant context
│   │   ├── core-mes-production/ # Producción en planta (work blocks, sync)
│   │   ├── orders/            # Órdenes de fabricación
│   │   ├── workstations/      # Puestos de trabajo y HMI
│   │   ├── manufacturing-models/ # Modelos de fabricación, BOM
│   │   ├── oee/               # Overall Equipment Effectiveness
│   │   ├── quality/           # Control de calidad y no conformidades
│   │   ├── cost/              # Costes de producción
│   │   ├── users/             # Gestión de usuarios y operarios
│   │   ├── tenant-capabilities/ # Feature flags JSONB por cliente
│   │   ├── global-admin/      # Administración multi-tenant
│   │   ├── auth-login/        # Login y registro de usuarios
│   │   ├── ai-advisor/        # Asistente IA industrial (RAG + multi-provider)
│   │   ├── queue/             # Colas asíncronas BullMQ (OEE, reportes, ingestión)
│   │   └── telemetry/         # OpenTelemetry SDK + métricas Prometheus
│   └── test/
├── frontend/                   # React HMI
│   ├── src/
│   │   ├── components/operator/ # HMI components
│   │   ├── store/             # Zustand state
│   │   └── lib/               # Dexie.js DB
│   └── __tests__/
├── docs/
│   ├── adr/                   # Architectural Decision Records
│   ├── technical/             # Documentación técnica
│   └── commercial/            # Documentación de negocio
├── KAVANA_RULES.md            # Reglas del proyecto
├── CONTRIBUTING.md            # Guía de contribución
└── DECISIONES_ESTRATEGICAS.md # Decisiones estratégicas
```

---

## Plataforma AI (Nuevo en v3.1)

### AI Advisor Industrial
Asistente IA integrado que permite a operarios y supervisores hacer preguntas en lenguaje natural sobre la producción. Responde usando datos reales de la planta (órdenes, OEE, calidad, work blocks).

- **Providers:** Ollama (local) · vLLM (self-hosted) · NVIDIA NIM · OpenRouter · OpenAI
- **Grounding estricto:** solo responde desde los datos del tenant
- **Evaluación:** recall@k + precision@k automáticos
- **Observabilidad:** tracing OpenTelemetry, métricas Prometheus, dashboard Grafana
- **Costes:** tracking por prompt (FinOps)

### Colas Asíncronas (BullMQ + Redis)
Jobs pesados desacoplados del request HTTP. Workers independientes escalables horizontalmente.

- `oee-recalc` — Recalcula OEE desde work blocks
- `report-export` — Exporta informes (CSV/JSON/PDF)
- `document-ingest` — Indexa manuales y specs para el AI Advisor

### Stack de Observabilidad
```bash
# Levantar con 1 comando:
METRICS_PORT=9464 docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```
- **Prometheus** (:9090) — Scrapea métricas cada 15s
- **Grafana** (:3000) — Dashboard LLM preconfigurado
- **Métricas:** latencia, tokens, coste, errores por provider/modelo

### Kubernetes
Manifiestos listos para producción: Deployments, Services, PVCs, ServiceMonitor (Prometheus Operator).

---

## Estado del proyecto

Transparencia sobre lo construido y lo pendiente. El objetivo es que quien lea esto pueda verificar cada punto en el repositorio.

### ✅ Implementado y verificable
- Arquitectura multi-tenant con aislamiento por RLS
- Backend funcional en NestJS (13 módulos) con autenticación y contexto de tenant
- Offline-first operativo (Dexie/IndexedDB + sincronización)
- Pruebas automatizadas (Vitest): ~208 tests en backend
- ADRs documentados (`docs/adr/`) con alternativas evaluadas
- Colas asíncronas con BullMQ + Redis
- Observabilidad: OpenTelemetry + Prometheus; Grafana vía docker-compose
- Manifiestos de Kubernetes en `k8s/` (Deployments, Services, ServiceMonitor)

### 🚧 En desarrollo / pendiente
- **Integración con PLC / OPC-UA / Modbus** — aún no conectado a maquinaria real
- **Implantación en producción piloto** — el producto no tiene clientes en producción todavía
- **Capturas reales de la interfaz** — los mockups del case study son vista previa de diseño
- **Trazabilidad documental certificada (ISO 9001 / GMP)** — el registro existe, pero no está auditado ni certificado

---

## Qué construiría después

- Sincronización bidireccional en conflicto (varios operarios editando la misma orden offline)
- Conectores PLC/OPC-UA para captura automática sin pulsación manual
- Dashboard de coste en tiempo real por turno, no solo por orden
- Modo "auditoría" con exportación inmutable para cumplimiento

---

## Documentación para Portfolio

Este proyecto documenta decisiones arquitectónicas clave para demostrar:

- **Juicio técnico** — [ADR](docs/adr/) con alternativas evaluadas
- **Proceso de ingeniería** — TDD estricto, 208 tests
- **Aprendizaje continuo** — [Decisions Log](docs/decisions-log.md) con lecciones
- **Enfoque en impacto de negocio** — cada ADR justifica su impacto operativo
- **Trazabilidad de decisiones** — Commits convencionales, ADRs datados

### Archivos Clave para Portfolio

| Archivo | Qué demuestra |
|---------|---------------|
| `docs/adr/001-*.md` | Juicio arquitectónico (RLS vs alternatives) |
| `docs/adr/002-*.md` | Diseño de feature flags (JSONB decision) |
| `docs/adr/003-*.md` | Offline-first (Dexie.js + FIFO sync) |
| `docs/adr/004-*.md` | UX industrial (tunnel vision) |
| `docs/decisions-log.md` | Evolución del conocimiento |
| `CONTRIBUTING.md` | Proceso de ingeniería (TDD/YAGNI) |
| `backend/src/auth/jwt.service.spec.ts` | Testing de seguridad (24 tests) |

---

## Contacto

**Desarrollado por:** Jorge Adán Rodríguez  
**Metodología:** IT Audit Agent (Hermes)  
**Última actualización:** 2026-07-23

---

*Arquitectura documentada con ADR. Cada decisión, justificada.*
