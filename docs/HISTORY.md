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
- PostgreSQL 16 con RLS como pilar de aislamiento (→ [ADR-001](adr/001-shared-schema-multi-tenant-rls.md))
- Feature flags como JSONB para flexibilidad sin migraciones (→ [ADR-002](adr/002-feature-flags-jsonb.md))
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
- Offline-first desde el inicio (→ [ADR-003](adr/003-offline-first-dexie.md))
- UX Tunnel Vision para operarios con guantes (→ [ADR-004](adr/004-ux-tunnel-vision.md))

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
- ✅ 216 tests backend (Vitest)

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
- AI Advisor como módulo independiente con proveedores intercambiables (→ [Executive Summary](commercial/00_executive-summary.md))
- Toolings con estimación preventiva (→ [ADR-005](adr/005-toolings-estimacion-preventiva.md))
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

## Fase 7: Auditoría y endurecimiento (Septiembre 2026)

Auditoría formal del proyecto en tres horizontes (`PLAN_AUDITORIA_MANUFACTURING.md`),
con los horizontes 1 (crítico) y 2 (importante) cerrados.

**Lo que destapó la auditoría y no se veía desde fuera:**

- **El registro de producción estaba roto, también en producción.** Una migración
  que añadía una columna vivía fuera de `database/migrations/`, así que nadie la
  aplicaba, y el INSERT del bloque enviaba un valor menos de los que pedía. Los dos
  arreglados, y el flujo completo quedó cubierto por un E2E que corre en el CI.
- **Siete endpoints devolvían 403 a todo el mundo, administrador incluido.** El
  guard de roles cierra por defecto y esos endpoints no declaraban política:
  `GET /tenant/capabilities` (que cada panel pide al arrancar, así que el panel caía
  a su almacén local y **un módulo desactivado seguía viéndose**) y todo el CRUD de
  incidencias. Lo encontró el test de contrato de roles, que ahora recorre todos los
  controllers ([ADR-007](adr/007-politicas-roles-por-metodo.md)).
- **El supervisor no podía crear órdenes**: los catálogos que alimentan su
  formulario exigían rol de administrador y los desplegables salían vacíos.
- **Un fallo falso en la bandeja del operario**: el reenvío de un parte chocaba con
  el bloque que él mismo acababa de crear, así que el parte entraba bien pero
  aparecía un error que no había ocurrido
  ([ADR-008](adr/008-huella-antes-que-solape.md)).
- **Dos suites E2E**, y el script de la raíz apuntaba a la que mockea la API, no a
  la que ejecuta el CI ([ADR-010](adr/010-una-sola-suite-e2e.md)).

**Lo añadido en esta fase:** el flujo vertical completo corriendo en el CI, el
tablero de incidencias con arrastre (supervisor y administrador, con un solo
componente), el KPI del turno, el aviso al operario sin puesto asignado, una sola
suite E2E, los permisos por método, y `npm install` funcionando
([ADR-009](adr/009-nestjs-una-version.md)).

**Métricas al cierre de la fase:** 409 tests de backend, 155 de frontend y 9
end-to-end, con los seis jobs del CI en verde.

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

*Última actualización: 2026-09-23*
