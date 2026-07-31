# Kavana Manufacturing — MES SaaS para Manufactura Industrial

[![Tests](https://img.shields.io/badge/tests-225%20passing-brightgreen)](https://github.com/kavanasystemsinfo-ui/kavana-systems-v3)
[![Coverage](https://img.shields.io/badge/coverage-85%25-yellowgreen)](docs/METRICS.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](docker-compose.yml)
[![Multi-Tenant](https://img.shields.io/badge/Multi‑Tenant-RLS%20enforced-8B5CF6)](docs/adr/001-shared-schema-multi-tenant-rls.md)
[![Offline-First](https://img.shields.io/badge/Offline‑First-Dexie.js-FF6B35)](docs/adr/003-offline-first-dexie.md)
[![OpenTelemetry](https://img.shields.io/badge/Telemetry-OpenTelemetry-FF6F00?logo=opentelemetry)](docs/technical/00_architecture-overview.md)
[![BullMQ](https://img.shields.io/badge/Queue-BullMQ%2BRedis-DC382D?logo=redis)](backend/src/queue/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## ⚡ 30 Segundos: ¿Qué es y para qué sirve?

**Problema que resuelve:** Las plantas de manufactura pierden tiempo y visibilidad cuando la producción depende de papel, hojas de cálculo o redes inestables. Los sistemas MES tradicionales cuestan decenas de miles de euros, requieren meses de implantación y fallan cuando se pierde conexión en planta.

**Solución:** Un MES SaaS multi-tenant que:
- Ejecuta órdenes de producción en **pantallas HMI táctiles** diseñadas para operarios con guantes
- **Funciona sin internet** (offline-first) — el registro nunca se pierde, aunque caiga la red
- Se **activa por features** (cada cliente paga solo lo que usa) sin deploy adicional
- **Aísla datos** de cada cliente con Row Level Security en PostgreSQL

**Stack:** React + Tailwind · NestJS · PostgreSQL 16 · Zustand + Dexie.js · Vitest (TDD)

**Nota sobre el proceso de desarrollo:** Este proyecto fue **diseñado y dirigido por un arquitecto de software**. La siguiente tabla resume quién hizo qué:

| Decisión / Trabajo | Responsable |
|-------------------|-------------|
| **Arquitectura del sistema** (RLS vs schema-per-tenant, offline-first, feature flags) | 👤 Arquitecto (Jorge) |
| **Modelado del dominio** (work blocks, BOM, órdenes, multi-tenancy) | 👤 Arquitecto (Jorge) |
| **Selección del stack** (NestJS, React, PostgreSQL, Dexie, BullMQ) | 👤 Arquitecto (Jorge) — cada elección justificada en ADRs |
| **Estructura de módulos y responsabilidades** | 👤 Arquitecto (Jorge) |
| **Código (implementación)** | 🤖 IA como par de programación, siguiendo las directrices del arquitecto |
| **Tests** (qué cubrir y qué priorizar) | 👤 Arquitecto (Jorge) — redacción: IA |
| **ADRs y documentación técnica** | 👤 Arquitecto (Jorge) — estructura y conclusiones |

**En resumen:** las decisiones son humanas. La IA actuó como un par de programación que ejecuta, no como un arquitecto que diseña. El repositorio contiene el código; el criterio es de Jorge.

**[🎯 Live Demo →](https://kavana-systems-v3-frontend.vercel.app)** — Tenant: `demo`, Usuario: `admin`, Contraseña: `admin123`

---

## 📖 Índice

1. [Arquitectura en 60 segundos](#-arquitectura-en-60-segundos)
2. [Decisiones clave (por qué cada tecnología)](#-decisiones-clave)
3. [Stack tecnológico](#-stack-tecnológico)
4. [Cómo ejecutar](#-cómo-ejecutar)
5. [Estado del proyecto](#-estado-del-proyecto)
6. [Documentación completa](#-documentación)
7. [Portfolio para consultores](#-portfolio-para-consultores-it)
8. [Seguridad](#-seguridad)
9. [Licencia y contacto](#-licencia)

---

## 🏗️ Arquitectura en 60 segundos

```
┌──────────────────────────────────────────────────────────────┐
│  OPERADOR EN PLANTA                                          │
│  ┌──────────┐  ┌────────────────────────────────────────┐   │
│  │ Orden:   │  │     ▶ REGISTRAR BLOQUE (80px)          │   │
│  │ #12345   │  │     (Botón grande - manos con guantes) │   │
│  │ En curso │  │                                        │   │
│  └──────────┘  └────────────────────────────────────────┘   │
│                        │  (offline-first)                    │
│                        ▼                                    │
│              ┌──────────────────┐                            │
│              │  IndexedDB local │ ← Sync FIFO con retry     │
│              │  (Dexie.js)      │ ← AbortController 4s      │
│              └────────┬─────────┘                            │
│                       │ (cuando hay red)                    │
│                       ▼                                     │
│              ┌──────────────────┐                            │
│              │  API Gateway     │ → Vercel → Render         │
│              │  (NestJS)        │ ← Proxy inverso            │
│              └────────┬─────────┘                            │
│                       ▼                                     │
│              ┌──────────────────┐   ┌──────────────┐        │
│              │  PostgreSQL 16   │   │ Redis (cols) │        │
│              │  + RLS por tenant│   │ BullMQ       │        │
│              └──────────────────┘   └──────────────┘        │
│              + Prometheus / Grafana / OpenTelemetry          │
└──────────────────────────────────────────────────────────────┘
```

**Flujo completo:**
1. Operario selecciona orden en HMI táctil
2. Registra bloque de producción (inicio/fin, cantidad, defectos)
3. Los datos se guardan **primero en IndexedDB local** (offline-safe)
4. Cuando hay conexión, sincroniza FIFO contra API REST
5. Backend valida, persiste en PostgreSQL con RLS y encola jobs async en BullMQ

---

## 🧠 Decisiones clave

Cada decisión arquitectónica responde a un **problema concreto de planta** y se documenta con alternativas evaluadas y justificación:

| Decisión | Problema | Por qué esta opción | Alternativas descartadas |
|----------|----------|---------------------|--------------------------|
| **RLS multi-tenant** | Aislar datos de clientes en una DB | Forzado en BD, no confía solo en código | Schema-per-tenant (migraciones inviables) → [ADR-001](docs/adr/001-shared-schema-multi-tenant-rls.md) |
| **Feature flags JSONB** | Clientes con necesidades distintas | Sin migraciones, activación instantánea | Tablas separadas (múltiples JOINs) → [ADR-002](docs/adr/002-feature-flags-jsonb.md) |
| **Offline-first (Dexie)** | Red inestable en planta | Cero pérdida de datos, sincronización FIFO | WebSockets (fallan sin conexión) → [ADR-003](docs/adr/003-offline-first-dexie.md) |
| **UX Tunnel Vision** | Operarios con guantes industriales | Botones 64px+, modo tunel, sin distracciones | UI estándar 44px (insuficiente) → [ADR-004](docs/adr/004-ux-tunnel-vision.md) |
| **TDD desde el inicio** | Evitar deuda técnica temprana | 208 tests backend, 17 frontend = confianza para refactor | Testing post-hoc (falla) → [CONTRIBUTING](CONTRIBUTING.md) |

> 📘 **Todas las decisiones documentadas en:** [`docs/adr/`](docs/adr/) · [`docs/decisions-log.md`](docs/decisions-log.md) · [`DECISIONES_ESTRATEGICAS.md`](DECISIONES_ESTRATEGICAS.md)

---

## 🛠️ Stack tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | React 19 + Vite + Tailwind CSS | Componentes reutilizables, HMI responsive con Tailwind, bundle optimizado |
| **Estado** | Zustand + Dexie.js (IndexedDB) | Offline-first con cola FIFO de sincronización |
| **Backend** | NestJS (TypeScript) | Arquitectura modular, DI, Guards para auth, soporte nativo para decorators |
| **BD Principal** | PostgreSQL 16 | RLS nativo, JSONB para features flags, `gin_trgm_ops` para búsqueda |
| **Colas** | BullMQ + Redis | Jobs desacoplados (OEE, informes, ingestión de documentos) |
| **AI Advisor** | RAG multi-provider (Ollama, vLLM, OpenAI, OpenRouter) | Asistente industrial contextualizado con datos reales |
| **Observabilidad** | OpenTelemetry + Prometheus + Grafana | Trazabilidad de principio a fin, métricas por provider/modelo |
| **Tests** | Vitest + Testing Library | TDD: 17 frontend + 208+ backend tests |
| **CI/CD** | GitHub Actions → Vercel + Render | Deploy automático en push a main |
| **Infra** | Vercel (frontend) · Render (backend) · Neon (PostgreSQL) · Upstash (Redis) |

---

## 🚀 Cómo ejecutar

```bash
# 1. Clonar
git clone https://github.com/kavanasystemsinfo-ui/kavana-systems-v3.git
cd kavana-systems-v3

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# 3. Backend
cd backend && npm install && npm run dev      # http://localhost:3001

# 4. Frontend (otra terminal)
cd frontend && npm install && npm run dev      # http://localhost:5173

# 5. Tests
npm run test                                   # 17 frontend tests
cd backend && npm run test                     # 208+ backend tests

# 6. Docker (stack completo)
docker compose up -d
```

**Demo online:** https://kavana-systems-v3-frontend.vercel.app  
**Health check API:** https://kavana-manufacturing-api.onrender.com/health

---

## 📊 Estado del proyecto

### ✅ Implementado y verificable
- [x] Arquitectura multi-tenant con RLS (PostgreSQL nativo)
- [x] Backend NestJS funcional (15+ módulos: auth, orders, OEE, quality, cost, materials, incidencias, toolings...)
- [x] Offline-first operativo (Dexie/IndexedDB + sincronización FIFO)
- [x] Feature flags JSONB (cada cliente activa solo lo que necesita)
- [x] AI Advisor industrial (RAG con datos reales de planta)
- [x] Fábrica demo completa (18 modelos solares, 15 puestos, 17 materias primas con BOM)
- [x] Tests automatizados: 17 frontend + 208 backend
- [x] ADRs documentados con alternativas evaluadas
- [x] Despliegue automatizado (Vercel + Render + Neon)
- [x] Tema dual (Kavana + Clásico) para diferentes perfiles de usuario

### 🚧 En desarrollo
- [ ] Integración PLC / OPC-UA / Modbus (captura automática sin pulsación manual)
- [ ] Implantación en producción piloto (el producto no tiene clientes reales aún)
- [ ] Capturas reales de interfaz en planta (los mockups son preview de diseño)
- [ ] Trazabilidad documental certificada (ISO 9001 / GMP)
- [ ] Sincronización bidireccional con resolución de conflictos
- [ ] Dashboard de coste en tiempo real por turno

### 📈 Evolución del proyecto
| Fase | Qué se construyó | Tests |
|------|-----------------|-------|
| 1. Auditoría V2 | Migración de MongoDB a PostgreSQL, RLS, multi-tenancy | — |
| 2. Backend Core | NestJS, auth, órdenes, OEE, calidad | 208 |
| 3. Frontend HMI | React, offline-first, tema dual, panels | 17 |
| 4. Módulos Avanzados | AI Advisor, Toolings, Incidencias, BOM, Colas | +50 |
| 5. Deploy & Docs | Vercel + Render + Neon, documentación completa | — |

---

## 📚 Documentación

### Para negocio / ventas
| Documento | Contenido |
|-----------|-----------|
| [Executive Summary](docs/commercial/00_executive-summary.md) | Resumen ejecutivo para decisores |
| [Product Positioning](docs/commercial/01_product-positioning.md) | Nicho de mercado y diferenciación |
| [Portfolio Case Study](docs/commercial/02_portfolio-case-study.md) | Estudio de caso completo (7 fases) |
| [One-Pager Ventas](docs/commercial/03_sales-one-pager.md) | Folleto comercial 1 página |
| [Feature-Benefits Matrix](docs/commercial/04_feature-benefits-matrix.md) | Matriz funcionalidad vs beneficio |

### Para arquitectura / decisiones técnicas
| Documento | Contenido |
|-----------|-----------|
| [ADR-001: RLS Multi-Tenancy](docs/adr/001-shared-schema-multi-tenant-rls.md) | Por qué RLS sobre schema-per-tenant |
| [ADR-002: Feature Flags JSONB](docs/adr/002-feature-flags-jsonb.md) | Flexibilidad sin migraciones |
| [ADR-003: Offline-First Dexie](docs/adr/003-offline-first-dexie.md) | Sincronización FIFO con retry |
| [ADR-004: UX Tunnel Vision](docs/adr/004-ux-tunnel-vision.md) | Diseño para operarios con guantes |
| [ADR-005: Toolings Estimation](docs/adr/005-toolings-estimacion-preventiva.md) | Estimación preventiva de utillajes |
| [Decisions Log](docs/decisions-log.md) | Lecciones aprendidas durante el desarrollo |
| [Decisiones Estratégicas](DECISIONES_ESTRATEGICAS.md) | Decisiones de alto nivel del proyecto |

### Para desarrolladores / deploy
| Documento | Contenido |
|-----------|-----------|
| [Guía de Deploy](docs/deploy/deploy-kavana-manufacturing.md) | Vercel + Render + Neon + DNS |
| [CONTRIBUTING](CONTRIBUTING.md) | Estándares de código, TDD, commits |
| [KAVANA RULES](KAVANA_RULES.md) | Reglas del proyecto (YAGNI, context-first) |
| [Arquitectura Técnica](docs/technical/00_architecture-overview.md) | Visión general del sistema |
| [Multi-Tenancy & RLS](docs/technical/01_multi-tenancy-rls-audit.md) | Auditoría de aislamiento |
| [Backend Auth](docs/technical/02_backend-auth-context.md) | JWT, roles, contexto de tenant |
| [Feature Flags](docs/technical/03_feature-flags-modularity.md) | Implementación de modularidad |
| [Core MES Production](docs/technical/04_core-mes-production.md) | Flujo de producción en planta |
| [Frontend Offline-First](docs/technical/05_frontend-hmi-offline-first.md) | Arquitectura del HMI offline |

---

## 💼 Portfolio para consultores IT

Este proyecto demuestra capacidades técnicas aplicadas a un dominio industrial real:

| Lo que demuestra | Dónde verlo |
|-----------------|-------------|
| **Arquitectura SaaS multi-tenant** | [ADR-001](docs/adr/001-shared-schema-multi-tenant-rls.md) + [technical/01](docs/technical/01_multi-tenancy-rls-audit.md) |
| **Offline-first resiliente** | [ADR-003](docs/adr/003-offline-first-dexie.md) + implementación en frontend |
| **UX industrial contextual** | [ADR-004](docs/adr/004-ux-tunnel-vision.md) + pantallas HMI |
| **TDD y calidad** | [CONTRIBUTING](CONTRIBUTING.md) + 225+ tests |
| **AI aplicada a industria** | [AI Advisor](docs/ai/README.md) + RAG multi-provider |
| **Feature flags como producto** | [ADR-002](docs/adr/002-feature-flags-jsonb.md) + módulo tenant-capabilities |
| **Documentación como infraestructura** | ADRs, decisions log, technical docs |
| **Proceso de ingeniería** | Commits convencionales, PR template, CI/CD |

### 🎯 Aprendizajes clave
1. **RLS > App logic** — Enforcement en BD es más seguro que en código
2. **Offline-first desde día 1** — No se puede agregar después
3. **JSONB para features** — Flexibilidad sin migraciones
4. **TDD estricto** — Confianza para refactoring agresivo
5. **UX contextual** — Investigar condiciones reales de uso (guantes, ruido, luz)

### ⚠️ Transparencia
- El producto **no tiene clientes en producción** — es un proyecto de portfolio/demo
- Las **capturas de interfaz** son mockups de diseño, no fotos de planta real
- La **trazabilidad documental** no está auditada ni certificada ISO

---

## 🔒 Seguridad

- **Autenticación:** JWT con HMAC, contexto de tenant en cada request (via `AsyncLocalStorage`)
- **Autorización:** Roles `global_admin` · `tenant_admin` · `supervisor` · `operator`, enforced via NestJS Guards
- **Aislamiento:** Row Level Security (RLS) en PostgreSQL — el tenant solo ve sus datos
- **Offline:** Los datos locales (IndexedDB) están aislados por tenant en el frontend
- **Variables de entorno:** [`backend/.env.example`](backend/.env.example) — sin secrets en el repo
- **CORS:** Configurado por entorno, origen verificado

> **Ver también:** [`docs/technical/07_security-qa-audit.md`](docs/technical/07_security-qa-audit.md)

---

## 📄 Licencia

MIT © [Jorge Adán Rodríguez](https://github.com/kavanasystemsinfo-ui)

---

**Desarrollado con:** Metodología TDD + YAGNI · Asistencia de IA para implementación  
**Última actualización:** 2026-07-23

*Cada decisión, justificada. Cada línea, testeada.*
