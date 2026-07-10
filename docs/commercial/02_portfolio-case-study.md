# Kavana Manufacturing - Caso de Estudio Profesional

## Estado del documento

- **Estado:** Portfolio actualizado con módulos premium integrados en UI y 178 tests.
- **Última actualización:** 2026-07-04.

## Título

Kavana Manufacturing: Plataforma MES SaaS Multi-Tenant, Offline-First y Modular para Producción Industrial.

## Contexto

El proyecto nace de la necesidad de construir un sistema MES moderno que combine la rigurosidad de un entorno industrial con la simplicidad de una aplicación móvil de consumo.

El reto principal es triple:

1. Ofrecer una experiencia de planta extremadamente simple para operarios.
2. Mantener una arquitectura técnica segura, escalable y multi-tenant.
3. Respetar la diversidad de usuarios con un sistema de temas dual.

## Desafío técnico

El proyecto debe resolver problemas complejos:

- Aislar datos entre clientes en una arquitectura SaaS.
- Garantizar seguridad incluso ante errores de aplicación.
- Soportar operación offline en planta.
- Evitar duplicidad de eventos.
- Permitir módulos premium activables por cliente.
- Adaptarse a distintos sectores sin cambiar el núcleo.
- Respetar preferencias visuales de usuarios tradicionales vs modernos.
- **Calcular OEE automáticamente** sin configuración manual.
- **Registrar calidad y costes** de forma simple y consistente.

## Solución propuesta

Kavana Manufacturing se diseña sobre ocho pilares:

- PostgreSQL con RLS y `tenant_id`.
- Backend seguro con JWT y contexto transaccional.
- Frontend HMI táctil offline-first.
- Feature flags JSONB.
- Custom fields para adaptación cross-sector.
- Dual Theme: sistema de temas que respeta la diversidad de usuarios industriales.
- **Módulos premium:** OEE, Quality y Cost como NestJS modules independientes.
- **Seguridad verificada:** 15 tests cross-tenant, 8 state machine, 9 sync integrity.

## Valor demostrado

El proyecto demuestra arquitectura profesional con:

- **Backend:** 178 tests passing, CRUD completo + módulos premium (OEE, Quality, Cost)
- **Frontend:** React + Tailwind con sistema de temas dual + OEE Dashboard
- **Panels:** Operario, Supervisor, Administrador — cada uno con variantes clásica y moderna
- **Seguridad:** JWT RS256, RLS enforcement, multi-tenant isolation verificada con tests
- **Módulos premium:** OEE (availability × performance × quality), Quality checks, Cost tracking
- **Documentación:** ADRs, decisions-log, technical docs, commercial portfolio

## Dual Theme: Diferencial Único

### GTA San Andreas Essence (Clásico ERP)
- Tablas HTML estándar
- Fondos claros (`bg-slate-50`)
- Bordes sutiles (`border-slate-200`)
- Badges de estado con colores semánticos
- Para supervisores veteranos y clientes legacy

### GTA 5 Graphics (Moderno Kavana)
- Tarjetas con bordes redondeados
- Fondos oscuros (`bg-kavana-dark`)
- Gradientres sutiles
- Toggle switches para estados
- Para operarios jóvenes y clientes innovadores

### Toggle Flotante
- Cambio en tiempo real entre temas
- Persistencia en `localStorage`
- Floating button bottom-right

## Evidencia de Portfolio

### Backend
- `/users` — CRUD completo con tests
- `/workstations` — CRUD completo con tests
- `/manufacturing-models` — CRUD completo con tests
- `/orders` — CRUD completo con tests
- `/oee` — OEE calculations + downtime breakdown (3 endpoints)
- `/quality` — Quality checks CRUD + summary (3 endpoints)
- `/cost` — Cost entries CRUD + summary by category (3 endpoints)
- JWT RS256 con `ALLOW_MOCK_AUTH` gated
- RLS enforcement en PostgreSQL
- **15 cross-tenant isolation tests**
- **8 order state machine tests**
- **9 sync integrity tests**

### Frontend
- `OperatorPanel.tsx` + `ClassicOperatorPanel.tsx`
- `SupervisorPanel.tsx` + `ClassicSupervisorPanel.tsx`
- `TenantAdminPanel.tsx` + `ClassicTenantAdminPanel.tsx`
- `OeeDashboard.tsx` — Grid de workstations con colores por OEE
- `QualityDashboard.tsx` — Creación de checks, resumen, tabla
- `CostDashboard.tsx` — Creación de entradas, gráfico por categoría, tabla
- Theme toggle con Zustand store compartido
- Tabs condicionales por feature flags en admin panel
- API client con timeout 4s y AbortController

### Documentación
- 4 ADRs (RLS, Feature Flags, Offline-First, UX Tunnel)
- 10 decisions en decisions-log
- Technical docs (00-11)
- Commercial portfolio (executive summary, case study, competitors)

## Resultado esperado

Un producto SaaS MES capaz de:
- Capturar producción industrial en tiempo real
- Resistir fallos de red (offline-first)
- Escalar por cliente (multi-tenant)
- Activar funcionalidades según plan contratado (feature flags)
- Respetar preferencias visuales de usuarios (dual theme)
- **Calcular OEE automáticamente por workstation**
- **Registrar y analizar calidad de producción**
- **Gestionar costes de producción por categoría**
