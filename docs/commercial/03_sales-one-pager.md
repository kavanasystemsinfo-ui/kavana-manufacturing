# Kavana Manufacturing - Sales One Pager

## Estado del documento

- **Estado:** Documento comercial actualizado con módulos premium integrados en UI.
- **Última actualización:** 2026-07-04.

## Kavana Manufacturing

**MES SaaS táctil, offline-first y multi-tenant para producción industrial.**

## Problema

Las plantas industriales necesitan capturar producción de forma rápida, fiable y sin depender de una red perfecta. Muchos sistemas existentes son demasiado complejos, poco táctiles o no están preparados para operar offline. Además, los usuarios industriales tienen preferencias visuales diversas — desde supervisores veteranos que prefieren ERP clásico hasta operarios jóvenes que prefieren interfaces modernas.

## Solución

Kavana Manufacturing ofrece una interfaz de planta simple, con botones grandes, flujos de 1 o 2 clics y persistencia local de eventos. El operario puede iniciar, pausar, reanudar y finalizar órdenes incluso sin conexión. **Además, ofrece un sistema de temas dual que respeta la diversidad de usuarios industriales.**

## Beneficios

- Menos errores manuales.
- Mayor trazabilidad de producción.
- Continuidad operativa ante caídas de red.
- Datos aislados por cliente.
- Implementación modular.
- Adaptación a distintos sectores.
- **Respeto por preferencias visuales de usuarios diversos.**

## Módulos

- **Core MES:** Órdenes, workstations, producción, usuarios — siempre activo.
- **OEE:** Cálculo automático de Overall Equipment Effectiveness por workstation.
- **Calidad:** Registro de checks de calidad y métricas de defectos.
- **Costes:** Tracking de costos de producción por categoría.
- **Administración de tenant:** Gestión de clientes y configuración SaaS.
- **Super Admin SaaS:** Panel de superadministrador multi-tenant.

## Diferenciales

- Seguridad multi-tenant con aislamiento estricto (verificado con 15 tests cross-tenant).
- UX industrial de baja carga cognitiva.
- Offline-first nativo con cola FIFO y dead-letter.
- Feature flags por cliente (JSONB `feature_matrix`).
- Campos personalizados sin cambiar la base de datos.
- HMI táctil con botones mínimos de 64px.
- Dual Theme: Clásico ERP + Moderno Kavana con toggle flotante.
- **Módulos premium activables:** OEE, Calidad, Costes — cada cliente paga por lo que necesita.
- **178 tests passing** con cobertura de seguridad, estados y sincronización.

## Evidencia actual

- **Backend:** NestJS con 178 tests (OEE, Quality, Cost, Users, Workstations, Orders, ManufacturingModels, Sync, Auth)
- **Frontend:** React + Tailwind con sistema de temas dual + 3 dashboards (OEE, Quality, Cost)
- **OEE Dashboard:** Grid de workstations con colores condicionales por OEE
- **Quality Dashboard:** Creación de checks, resumen pass/fail, tabla de historial
- **Cost Dashboard:** Creación de entradas, gráfico por categoría, tabla de historial
- **Offline-first:** IndexedDB/Dexie, cola FIFO, sincronización con idempotencia
- **Seguridad:** Cross-tenant isolation verificada con 15 tests, state machine con 8 tests
- **Modularidad:** Feature flags JSONB, 3 módulos premium con `@RequireFeature` guard
- **DB:** 14 migraciones (000-013), tablas `quality_checks` y `cost_entries` con RLS
- **Build exitoso:** TypeScript limpio, Vite build optimizado (63 modules, 422 kB)

## Mensaje final

Kavana Manufacturing está diseñado para llevar la captura de producción industrial al siguiente nivel: simple para el operario, seguro para el negocio, escalable para el proveedor SaaS — **y con módulos premium que cada cliente activa según necesite**.
