# Kavana V3 - Resumen Ejecutivo

## Estado del documento

- **Estado:** Portfolio comercial actualizado con módulos premium integrados en UI y 178 tests.
- **Última actualización:** 2026-07-04.

## Qué es Kavana V3

Kavana V3 es una plataforma MES SaaS diseñada para digitalizar la ejecución de producción industrial con una experiencia táctil simple, segura y resistente a caídas de red.

Su objetivo es reemplazar procesos manuales, hojas de cálculo y sistemas rígidos por una aplicación moderna de planta que permita a operarios, supervisores y administradores trabajar con flujos rápidos, datos fiables y control multi-tenant.

## Problema que resuelve

Muchas plantas industriales necesitan registrar producción en tiempo real, pero se enfrentan a:

- Software ERP demasiado pesado para planta.
- Interfaces lentas o poco táctiles.
- Dependencia excesiva de red Wi-Fi industrial.
- Falta de trazabilidad de tiempos y estados.
- Dificultad para adaptar el sistema a distintos sectores.
- Riesgo de mezclar datos entre clientes en soluciones SaaS mal aisladas.
- Resistencia al cambio por parte de usuarios acostumbrados a ERP clásicos.

## Propuesta de valor

Kavana V3 ofrece:

- **MES moderno:** gestión de órdenes, puestos, tiempos y estados.
- **UX industrial:** botones grandes, flujos de 1 o 2 clics y visión de túnel.
- **Offline-first:** el operario puede seguir trabajando aunque caiga la red.
- **SaaS multi-tenant:** cada cliente mantiene sus datos completamente aislados.
- **Modularidad:** módulos premium como OEE, Calidad y Costes se activan según necesidad.
- **Cross-sector:** núcleo adaptable a diferentes industrias mediante campos personalizados.
- **Dual Theme:** sistema de temas que respeta la diversidad de usuarios industriales.
- **OEE automático:** cálculo de Overall Equipment Effectiveness sin configuración manual.

## Diferencial profesional

Kavana V3 no es solo una aplicación de producción. Es un proyecto arquitectónicamente diseñado con estándares de seguridad, escalabilidad y experiencia de usuario industrial.

### Dual Theme: GTA San Andreas + GTA 5

Un diferencial único en el mercado MES: **dos estilos visuales** que coexisten:

- **Clásico ERP (GTA San Andreas essence):** Tablas, fondos claros, tipografía limpia — para supervisores veteranos y clientes legacy.
- **Moderno Kavana (GTA 5 graphics):** Tarjetas, fondos oscuros, gradientes — para operarios jóvenes y clientes innovadores.

El usuario elige su estilo preferido con un toggle flotante. La preferencia se persiste en localStorage.

## Estado actual

El proyecto cuenta con:
- Documentación maestra y reglas arquitectónicas
- Backend NestJS con 178 tests passing (OEE, Quality, Cost incluidos)
- Frontend React con sistema de temas dual + OEE/Quality/Cost dashboards
- Panel de operario, supervisor y administrador
- CRUD completo para órdenes, workstations, modelos de fabricación y usuarios
- Sistema de autenticación JWT con multi-tenant RLS
- **3 módulos premium funcionales:** OEE (3 endpoints), Quality (3 endpoints), Cost (3 endpoints)
- **3 dashboards frontend:** OEE (grid workstations), Quality (checks + resumen), Cost (entries + gráfico)
- **2 tablas DB:** `quality_checks` y `cost_entries` con RLS e índices
- **Seguridad verificada:** 15 cross-tenant tests, 8 state machine tests, 9 sync integrity tests
- **Tabs condicionales:** Admin panel muestra solo módulos habilitados por feature flags
