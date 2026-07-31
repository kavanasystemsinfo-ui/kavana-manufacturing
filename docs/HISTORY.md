# 📜 Historia del Proyecto — Kavana Manufacturing

*Evolución, decisiones y aprendizajes desde la V2 hasta hoy.*

---

## Fase 0: El origen (Julio 2025 — Mayo 2026)

**Contexto:** Kavana existía como **V2** — un prototipo funcional con Node.js (Express) + MongoDB + frontend JavaScript vanilla + Pug templates. Funcionaba, pero no era escalable ni mantenible.

**Problemas detectados:**
- Sin multi-tenancy real — datos de clientes mezclados
- Sin tests automatizados — cualquier cambio rompía algo
- Sin documentación arquitectónica — nadie sabía por qué se tomaron las decisiones
- Frontend monolítico sin separación de responsabilidades
- MongoDB sin esquema — datos inconsistentes entre colecciones

**Decisión clave:** Refactorizar desde cero en lugar de parchear. Migrar a PostgreSQL + NestJS + React.

**Lo descartado:** Schema-per-tenant en PostgreSQL (complejidad de migraciones inviable).

---

## Fase 1: Fundación Técnica (Junio 2026)

**Objetivo:** Construir la base multi-tenant sobre la que crecer.

**Decisiones:**
- PostgreSQL 16 con RLS como pilar de aislamiento (→ [ADR-001](docs/adr/001-shared-schema-multi-tenant-rls.md))
- Feature flags como JSONB para flexibilidad sin migraciones (→ [ADR-002](docs/adr/002-feature-flags-jsonb.md))
- NestJS como framework backend por su modularidad nativa y DI

**Resultado:**
- ✅ Backend funcional con autenticación JWT + contexto de tenant
- ✅ Módulo base de usuarios, tenants, roles
- ✅ Feature flags operativos por tenant
- ❌ Sin frontend todavía
- ❌ Sin tests automatizados

**Lección aprendida:** RLS es más fácil de implementar al principio que de añadir después.

---

## Fase 2: Core de Producción (Junio 2026)

**Objetivo:** Implementar el flujo MES básico — órdenes, puestos, registro de producción.

**Decisiones:**
- Work blocks (bloques de tiempo) en lugar de máquina de estados en tiempo real (→ [Decisión Estratégica](DECISIONES_ESTRATEGICAS.md))
- Offline-first desde el inicio (→ [ADR-003](docs/adr/003-offline-first-dexie.md))
- UX Tunnel Vision para operarios con guantes (→ [ADR-004](docs/adr/004-ux-tunnel-vision.md))

**Resultado:**
- ✅ Módulo `core-mes-production` con registro de work blocks
- ✅ Módulo `orders` con ciclo de vida de órdenes
- ✅ Módulo `workstations` para puestos de trabajo
- ✅ Módulo `manufacturing-models` para BOM y modelos
- ✅ Frontend HMI básico con React + Zustand + Dexie.js
- ✅ Sincronización offline-first funcional (FIFO + retry)

**Lección aprendida:** Los operarios no interactúan con el sistema en tiempo real. El diseño retrospectivo (work blocks) es más tolerante a la realidad de planta.

---

## Fase 3: Módulos de Gestión (Julio 2026, Semana 1)

**Objetivo:** Añadir los pilares de análisis y control: OEE, calidad, costes.

**Decisiones:**
- Cada módulo como plugin independiente — se activa por feature flag
- BullMQ + Redis para jobs asíncronos pesados (recálculo OEE, exportación informes)
- OpenTelemetry + Prometheus + Grafana para observabilidad desde el inicio

**Resultado:**
- ✅ Módulo `oee` (Overall Equipment Effectiveness)
- ✅ Módulo `quality` (control de calidad y no conformidades)
- ✅ Módulo `cost` (costes de producción)
- ✅ Colas asíncronas con workers independientes
- ✅ Dashboard OEE visible en el panel de operario
- ✅ 208 tests backend (Vitest)

**Lo descartado:** Dashboard de coste en tiempo real por turno (pendiente para fase posterior).

---

## Fase 4: Paneles Administrativos (Julio 2026, Semana 2)

**Objetivo:** Interfaces completas para administración multi-tenant.

**Decisiones:**
- Panel Admin global + Panel Admin por tenant
- Tema dual (Kavana + Clásico) para diferentes perfiles de usuario
- Custom fields JSONB para flexibilidad por cliente

**Resultado:**
- ✅ AdminPanel + ClassicAdminPanel + GlobalAdmin
- ✅ SupervisorPanel + ClassicSupervisorPanel
- ✅ OperatorPanel + ClassicOperatorPanel
- ✅ Custom fields configurables por tenant
- ✅ Tema Kavana con diseño industrial (naranja/oscuro)
- ✅ 17 tests frontend

**Lección aprendida:** El tema dual fue una decisión de producto acertada — supervisores veteranos prefieren el clásico, operarios jóvenes el moderno.

---

## Fase 5: Módulos Avanzados (Julio 2026, Semana 3)

**Objetivo:** Funcionalidades de valor añadido: AI Advisor, Toolings, Incidencias, BOM.

**Decisiones:**
- AI Advisor como módulo independiente con proveedores intercambiables (→ [docs/ai/](docs/ai/))
- Toolings con estimación preventiva (→ [ADR-005](docs/adr/005-toolings-estimacion-preventiva.md))
- BOM como feature flag `materials_management`

**Resultado:**
- ✅ AI Advisor: RAG con pgvector + multi-provider (Ollama, vLLM, OpenAI, OpenRouter)
- ✅ Toolings: catálogo + estimación por ciclo
- ✅ Incidencias: módulo completo con workflow (abierta → en_progreso → resuelta)
- ✅ BOM: 17 materias primas + 25 relaciones con modelos
- ✅ 18 modelos de fabricación (paneles solares) + 15 puestos

---

## Fase 6: Deploy y Documentación (Julio 2026, Semana 4)

**Objetivo:** Poner el producto accesible online con documentación profesional.

**Decisiones:**
- Vercel (frontend) + Render (backend) + Neon (PostgreSQL)
- Seed completo de fábrica solar demo realista
- Documentación separada por audiencia: commercial, technical, ADR

**Resultado:**
- ✅ **Live demo:** [kavana-systems-v3-frontend.vercel.app](https://kavana-systems-v3-frontend.vercel.app)
- ✅ **API Health:** [kavana-manufacturing-api.onrender.com/health](https://kavana-manufacturing-api.onrender.com/health)
- ✅ 6 documentos comerciales (executive summary, case study, one-pager, ...)
- ✅ 5 ADRs documentados con alternativas evaluadas
- ✅ 10+ documentos técnicos
- ✅ Deploy automatizado (GitHub → Vercel + Render)
- ✅ CI/CD workflow
- ✅ Rama `portfolio` sin tooling de IA

---

## Resumen de Evolución

```
Jun 2026  │  F1: Fundación técnica (NestJS, RLS, auth, multi-tenant)
          │  F2: Core de producción (work blocks, offline-first, HMI)
Jul W1    │  F3: Módulos de gestión (OEE, calidad, costes, colas)
Jul W2    │  F4: Paneles administrativos (admin, supervisor, tema dual)
Jul W3    │  F5: Módulos avanzados (AI Advisor, Toolings, Incidencias, BOM)
Jul W4    │  F6: Deploy, live demo, documentación profesional
```

**Línea de tiempo real:** ~4 semanas de desarrollo desde la refactorización V2 hasta la demo desplegada.

---

## Decisiones Descartadas (Tan importantes como las implementadas)

| Decisión descartada | Por qué no se hizo | Qué aprendimos |
|--------------------|-------------------|----------------|
| **Schema-per-tenant** | Migraciones inviables con N clientes | RLS es la solución correcta para SaaS |
| **WebSockets para offline** | Fallan sin conexión | El offline-first con IndexedDB es más robusto |
| **Máquina de estados en tiempo real** | Los operarios no interactúan en tiempo real | Work blocks retrospectivos son más realistas |
| **UI estándar 44px** | Insuficiente con guantes industriales | 64px+ + modo tunel fue la decisión correcta |
| **Testing post-hoc** | Difícil agregar tests después del código | TDD desde el inicio es la única vía sostenible |
| **Docker para todo el stack** | No necesario para SaaS | Solo Docker para BD/Redis local; Vercel + Render para producción |

---

*Cada fase documentada con su justificación. Cada decisión descartada, también.*

*Última actualización: 2026-07-23*
