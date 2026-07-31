# Kavana Manufacturing - Arquitectura Técnica General

## Estado del documento

- **Estado:** Diseño base documentado. Implementación en Fase 5.5.
- **Última actualización:** 2026-07-04.
- **Fuente principal:** [Blueprint del proyecto](root/📋%20BLUEPRINT%20DE%20PROYECTO_%20KAVANA%20V3.docx:1).
- **Reglas globales:** [.clinerules](.clinerules:1).

## Objetivo

Definir la arquitectura base de Kavana Manufacturing como sistema MES SaaS multi-tenant, modular, offline-first y preparado para escalar como plataforma industrial cross-sector.

## Visión arquitectónica

Kavana Manufacturing se plantea como una plataforma de ejecución de producción para planta industrial con cuatro capas principales:

1. **Frontend HMI táctil**
   - React + Tailwind.
   - UX de visión de túnel.
   - Botones mínimos de 64px.
   - Offline-first con IndexedDB/Dexie.js.
   - API calls con `AbortController` y timeout de 4s.

2. **Backend API**
   - Node.js / NestJS.
   - JWT validado con RS256/JWKS.
   - Contexto de tenant mediante `AsyncLocalStorage.run()`.
   - Guards de roles y feature flags.
   - Transacciones con `SET LOCAL app.current_tenant_id`.

3. **Base de datos PostgreSQL 18**
   - Shared-schema multi-tenant.
   - `tenant_id BIGINT NOT NULL` en toda entidad multi-tenant.
   - PK compuestas `(tenant_id, id)`.
   - FK compuestas para evitar cruces entre tenants.
   - RLS activado y forzado.
   - Índices liderados por `tenant_id`.

4. **Documentación y gobernanza**
   - Documentación maestra bajo [`root/`](root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md:1).
   - Skills bajo [`root/skills/`](root/skills/README.md:1).
   - Auditoría continua activable mediante `$d`.

## Módulos previstos

- Core MES.
- OEE.
- Calidad.
- Costes.
- Administración de tenant.
- Super Admin SaaS.

## Estado actual del repositorio

Implementación existente:

- Documentación maestra.
- Skills de RooCode.
- Migraciones SQL para tenants, usuarios, puestos, órdenes y logs de producción.
- Migración de gobernanza de tenant con `feature_matrix`, `custom_fields_schema`, `hard_limits`, `governance_version` y auditoría en [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:1).
- Frontend HMI mínimo offline-first.
- Backend mínimo de sincronización offline.

Pendiente de implementación:

- Validación real de migraciones, grants y smoke tests contra PostgreSQL 18 mediante `npm run database:smoke`.
- Backend API con autenticación JWT real/JWKS.
- Endpoint de capacidades y guards backend por módulo.
- Caché L1/L2 para `feature_matrix`.
- Panel Tenant Admin.
- Validador dinámico de custom fields.
- Service Worker/PWA shell.
- Tests de aislamiento con DB real.

## Principios no negociables

- Aislamiento total de datos.
- Seguridad Fail-Closed.
- Modularidad por carpetas.
- Feature flags JSONB.
- Offline-first.
- UX industrial de baja carga cognitiva.
- Trazabilidad documental continua.
