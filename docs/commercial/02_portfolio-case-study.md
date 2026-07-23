# Kavana Manufacturing — Caso de Estudio Profesional

**Autor:** Jorge Adán Rodríguez
**Última actualización:** 2026-07-23

---

## Resumen

Kavana Manufacturing es una plataforma MES SaaS diseñada para digitalizar la ejecución de producción industrial con una experiencia táctil simple, segura y resistente a caídas de red.

El proyecto partió de un codebase funcional pero con deuda técnica significativa (métricas infladas, código no tipado, documentación ausente, sin tests, sin contenedorización). Se sometió a un proceso de refactorización sistemática en 7 fases, ejecutada en menos de 60 minutos de trabajo asistido por IA, que lo transformó en un producto profesional documentado, testeado y desplegable.

**Estado final:** 216 tests (30 test files), 13 módulos backend, documentación ADR completa, Docker multi-stage, plataforma AI industrial, observabilidad Prometheus+Grafana.

---

## Fase 1 — Auditoría y diagnóstico del codebase

### Objetivo
Evaluar el estado real del proyecto: qué existe, qué está roto, qué se promete sin respaldo.

### Acciones
- Inventario completo del codebase: backend NestJS, frontend React, estructura de carpetas.
- Detección de **métricas inventadas** en README.md (se afirmaban cosas que el código no soportaba).
- Identificación de código con tipos `any` sin resolver, ausencia de tests en módulos core, documentación faltante.
- Auditoría de landing page: enlaces rotos (GitHub apuntaba a repos inexistentes), promesas de funcionalidades no implementadas.
- Revisión de ADRs existentes y decisions-log.

### Resultado
- Diagnóstico documentado en `docs/audit/` y `DECISIONES_ARQUITECTURA.md`.
- Lista priorizada de intervenciones ordenadas por impacto.

---

## Fase 2 — Saneamiento y documentación honesta

### Objetivo
Eliminar la brecha entre lo que el proyecto promete y lo que realmente entrega. La honestidad técnica es el pilar del portfolio.

### Acciones
- **README.md reescrito** sin métricas inventadas. Cada afirmación es verificable en el código.
- Sección "Estado del proyecto" con ✅ implementado y 🚧 pendiente claramente diferenciados.
- **Landing page** (`/manufacturing`) corregida: eliminadas promesas de funcionalidades que no existen (mermas, ISO, stock). Enlaces GitHub reparados.
- Landing pivota a perfil de contratación: "Cómo lo construí" en lugar de pitch comercial SaaS.
- **SEO/GEO**: canonical, JSON-LD, robots.txt, sitemap, perfiles LinkedIn/GitHub reales.

### Resultado
- README veraz. Landing page profesional orientada a hiring. Presencia digital completa.

---

## Fase 3 — Tests y hardening del backend

### Objetivo
Establecer disciplina TDD donde no la había. Blindar el core contra regresiones.

### Acciones
- **3 nuevos spec files**: `context-version.spec.ts` (7 tests), `cost-tracking.spec.ts` (11 tests), `telemetry.spec.ts` (3 tests).
- **Refactor OEE**: reemplazar tipos `any` por interfaz `DowntimeRow` con tipado fuerte.
- **Supervisor store tests**: 5 tests unitarios (loadOrders, addOrder, polling).
- **Sync E2E**: corregido fichero Python mal nombrado como `.ts`.
- **Patrón de mocks unificado**: se documentan los dos patrones NestJS (tenantQuery vs DATABASE_POOL injection) para que futuros tests sean consistentes.
- **Caché en AI Advisor**: TTL 60s, key normalizada, 3 tests de integración.

### Resultado
- **De 0 → 216 tests (30 test files), 0 failures.**
- Cobertura real de servicios core. Patrón de mock documentado para futuros contribuidores.

---

## Fase 4 — Landing page y presencia digital

### Objetivo
Crear una presencia web profesional que funcione como portfolio y herramienta de hiring.

### Acciones
- **Página personal Kavana Systems** (`/welcome`): foto real, bio, perfiles, proyectos.
- **Landing Manufacturing**: diagrama de flujo funcional, mockups visuales, sección "Estado del proyecto", call-to-action de empleo.
- **Sección "Para contratar"**: enfoque en cómo se construyó, no en pricing. Diferencial: experiencia industrial real + construcción con IA.
- **Diseño responsive**: hero ampliado a 1080px, bloques visuales con fondos alternos, tipografía clamp 52-68px.
- **Sección de evidencias**: enlaces verificables al repositorio, ADRs, decisions-log.

### Resultado
- Portfolio web funcional y honesto. Preparado para que reclutadores evalúen el trabajo real.

---

## Fase 5 — Módulos funcionales (Toolings e Incidencias)

### Objetivo
Completar huecos funcionales del MES que estaban planificados pero no implementados.

### Acciones
- **Toolings module**: frontend completo con gestión de utillajes y herramientas de planta.
- **Incidencias module**: backend + frontend para registro y seguimiento de incidencias en producción.
- **Documentación asociada**: ADR del módulo toolings, actualización de changelog y decisions-log.
- **Feature flags**: los nuevos módulos se integran con el sistema existente de activación por tenant.

### Resultado
- MES más completo. Dos módulos funcionales añadidos sin romper la arquitectura existente.

---

## Fase 6 — Plataforma AI Industrial

### Objetivo
Integrar un asistente IA contextual que permita a operarios y supervisores consultar la producción en lenguaje natural, usando datos reales de la planta.

### Acciones
- **AI Advisor**: nuevo módulo NestJS con endpoint `POST /ai-advisor/ask`.
- **RAG contextual**: recupera datos reales de producción (órdenes, OEE, calidad, work blocks) y los inyecta como contexto al LLM. Responde solo desde datos del tenant.
- **Multi-provider**: Ollama (local, llama3.1:8b), NVIDIA NIM, OpenRouter, OpenAI, vLLM. Selección dinámica por variable de entorno.
- **OpenTelemetry tracing**: spans por cada llamada LLM con latencia, tokens, provider, modelo, tenant.
- **Métricas Prometheus**: histograma `llm.prompt.latency_ms`, contadores de tokens y status. Dashboard Grafana preconfigurado.
- **Evaluación RAG automática**: 6 casos de prueba con métricas recall@k y precision@k. Script `npm run eval:advisor`.
- **Colas asíncronas BullMQ + Redis**: workers para OEE recalc, exportación de reportes, ingestión de documentos. Worker independiente escalable horizontalmente.
- **Cost tracking FinOps**: coste en centavos USD por prompt. Versionado de embeddings SHA-256.
- **Gap final**: providers vLLM, pipeline de ingestión, K8s manifests para despliegue de AI Advisor.

### Resultado
- Plataforma AI industrial completa, productiva, observable y con coste controlado. 11/11 gaps cerrados.

---

## Fase 7 — Contenedorización y despliegue

### Objetivo
Preparar el proyecto para despliegue real con Docker y Kubernetes.

### Acciones
- **Dockerfile backend**: multi-stage (build → producción). Excluye spec files. Imagen final ~112MB. Usuario no-root, healthcheck.
- **Dockerfile frontend**: build Vite + nginx SPA con proxy inverso a backend.
- **docker-compose.yml**: PostgreSQL 16 + Redis + backend + worker + frontend con healthchecks.
- **docker-compose.observability.yml**: Prometheus + Grafana auto-provisionado con dashboard LLM.
- **K8s manifests**: Deployments, Services, PVCs, ServiceMonitor para Prometheus Operator.
- **tsconfig.build.json**: excluye spec files del build de producción.

### Resultado
- `docker compose up -d` levanta todo el stack. Despliegue reproducible en cualquier entorno.

---

## Resultado final

### Métricas reales verificables

| Métrica | Valor | Cómo se verifica |
|---------|-------|------------------|
| Tests | 216 (30 files) | `npm test` |
| Módulos backend | 13 | `backend/src/` |
| Cobertura core | 100% servicios con tests | `vitest run` |
| Docker images | Backend 112MB, Frontend nginx | `docker build` |
| Providers AI | 5 (Ollama, NVIDIA, OpenRouter, OpenAI, vLLM) | `LLM_PROVIDER` env |
| Documentación | ADRs, decisions-log, technical docs, commercial | `docs/` |
| Despliegue | Docker + K8s + Render-ready | `k8s/`, `docker-compose.yml` |

### Lo que NO tiene (honestidad)

- Sin implantación en producción real con clientes.
- Sin integración con PLC/OPC-UA/Modbus.
- Sin certificación ISO 9001/GMP.
- Sin pruebas E2E con Playwright/Cypress (pendiente).

### Stack tecnológico final

| Componente | Tecnología |
|------------|-----------|
| Backend | NestJS + TypeScript |
| Frontend | React + Tailwind + Zustand |
| Base de datos | PostgreSQL 16 + RLS + pgvector |
| Cache/Colas | Redis + BullMQ |
| AI | Multi-provider (Ollama, vLLM, OpenAI, etc.) |
| Observabilidad | OpenTelemetry + Prometheus + Grafana |
| Contenedores | Docker multi-stage + docker-compose |
| Orquestación | Kubernetes (manifests) |
| Testing | Vitest, 216 tests |

---

## Principios de ingeniería aplicados

1. **TDD estricto** — test antes de código, rojo→verde→refactor.
2. **YAGNI** — no construir nada que no se necesite hoy.
3. **Honestidad técnica** — no prometer lo que el código no entrega.
4. **Context-first** — leer la arquitectura existente antes de modificar.
5. **Seguridad por diseño** — RLS fail-closed, JWT RS256, tenant isolation.
6. **Offline-first** — el operario nunca pierde datos aunque caiga la red.
7. **Eficiencia radical** — todo el proceso de refactorización se ejecutó en menos de 60 minutos de trabajo asistido por IA, priorizando impacto sobre volumen.
