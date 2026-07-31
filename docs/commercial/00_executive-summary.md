# Kavana Manufacturing - Resumen Ejecutivo

## Estado del documento

- **Estado:** Portfolio profesional actualizado con plataforma AI, 216 tests y contenedorización completa.
- **Última actualización:** 2026-07-23.

## Qué es Kavana Manufacturing

Kavana Manufacturing es una plataforma MES SaaS diseñada para digitalizar la ejecución de producción industrial con una experiencia táctil simple, segura y resistente a caídas de red.

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

Kavana Manufacturing ofrece:

- **MES moderno:** gestión de órdenes, puestos, tiempos y estados.
- **UX industrial:** botones grandes, flujos de 1 o 2 clics y visión de túnel.
- **Offline-first:** el operario puede seguir trabajando aunque caiga la red.
- **SaaS multi-tenant:** cada cliente mantiene sus datos completamente aislados.
- **Modularidad:** módulos premium como OEE, Calidad, Costes, Toolings e Incidencias se activan según necesidad.
- **Cross-sector:** núcleo adaptable a diferentes industrias mediante campos personalizados.
- **Dual Theme:** sistema de temas que respeta la diversidad de usuarios industriales.
- **AI Advisor:** asistente industrial con RAG sobre datos reales de producción, multi-provider.
- **Observabilidad:** Prometheus + Grafana + OpenTelemetry para monitorización LLM.

## Diferencial profesional

Kavana Manufacturing no es solo una aplicación de producción. Es un proyecto arquitectónicamente diseñado con estándares de seguridad, escalabilidad y experiencia de usuario industrial.

### Dual Theme: GTA San Andreas + GTA 5

Un diferencial único en el mercado MES: **dos estilos visuales** que coexisten:

- **Clásico ERP (GTA San Andreas essence):** Tablas, fondos claros, tipografía limpia — para supervisores veteranos y clientes legacy.
- **Moderno Kavana (GTA 5 graphics):** Tarjetas, fondos oscuros, gradientes — para operarios jóvenes y clientes innovadores.

El usuario elige su estilo preferido con un toggle flotante. La preferencia se persiste en localStorage.

### AI Advisor Industrial

Asistente IA contextual que responde preguntas sobre la producción usando datos reales del tenant. Soporta Ollama (local), vLLM, NVIDIA NIM, OpenRouter y OpenAI. Con trazabilidad OpenTelemetry, dashboard Grafana y cost tracking FinOps.

## Estado actual

El proyecto cuenta con:
- **216 tests (30 test files)** en verde — TDD estricto desde la refactorización.
- **13 módulos backend NestJS** con autenticación JWT + RLS multi-tenant.
- **Frontend React** con sistema de temas dual + dashboards (OEE, Quality, Cost).
- **Panel de operario, supervisor y administrador** con variantes clásica y moderna.
- **AI Advisor industrial** con RAG + pgvector + 5 proveedores LLM.
- **Colas asíncronas** BullMQ + Redis (OEE recalc, report export, ingestión).
- **Observabilidad** OpenTelemetry + Prometheus + Grafana.
- **Docker multi-stage** backend/frontend + docker-compose + K8s manifests.
- **Plataforma AI** con evaluación automática, cost tracking y versionado de embeddings.
- **Documentación completa:** ADRs, decisions-log, technical docs, commercial portfolio.
