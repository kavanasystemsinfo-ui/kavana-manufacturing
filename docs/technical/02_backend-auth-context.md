# Kavana Manufacturing - Backend, Autenticación y Contexto de Tenant

## Estado del documento

- **Estado:** Backend completado con 136 tests. Dual theme + guías de usuario + OEE opcional implementados, unificación completada, type casting hardening, Graphify integrado.
- **Última actualización:** 2026-07-07.
- **Fuentes maestras:** [02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md](root/02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md:1), [04_MASTER_AUTENTICACION_Roles_y_Permisos.md](root/04_MASTER_AUTENTICACION_Roles_y_Permisos.md:1).

## Objetivo

Definir el estándar backend para autenticación, autorización, propagación de contexto y aislamiento transaccional.

## Estándar backend obligatorio

- JWT validado con RS256/JWKS.
- `tenant_id` extraído exclusivamente de claims firmados.
- Prohibido confiar en `tenant_id` del body, query o headers no firmados.
- Contexto propagado con `AsyncLocalStorage.run()`.
- Prohibido `AsyncLocalStorage.enterWith()`.
- Transacciones iniciadas antes de `SET LOCAL`.
- Prohibido `SET SESSION` con PgBouncer Transaction Pooling.
- Rol de base de datos `kavana_app` sin `BYPASSRLS`.

## Roles previstos

- `super_admin`.
- `tenant_admin`.
- `supervisor`.
- `operario`.

## Estado actual

- Backend NestJS mínimo implementado en [`backend/src/app.module.ts`](backend/src/app.module.ts:1).
- Middleware de contexto en [`backend/src/auth/tenant-context.middleware.ts`](backend/src/auth/tenant-context.middleware.ts:1).
- `AsyncLocalStorage.run()` en [`backend/src/auth/tenant-context.middleware.ts`](backend/src/auth/tenant-context.middleware.ts:14).
- Validación RS256 con clave pública configurada en [`backend/src/auth/jwt.service.ts`](backend/src/auth/jwt.service.ts:21).
- Transacción con `SET LOCAL` en [`backend/src/db/withTenantTransaction.ts`](backend/src/db/withTenantTransaction.ts:13).
- Core MES con transiciones, logs y sincronización offline en [`backend/src/core-mes-production/core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:1).
- Validación SQL real disponible mediante `npm run database:smoke` en [`database/scripts/run-postgres-smoke.js`](database/scripts/run-postgres-smoke.js:1).
- **138 tests** funcionales en verde.

## Dual Theme - Soporte Backend

El backend no necesita cambios para soportar dual theme:
- Los endpoints sirven datos independientemente del tema visual
- El frontend selecciona la variante visual (clásica/moderna) según `localStorage`
- El Zustand store es compartido entre temas

## Brechas actuales

- Falta validación JWKS remota o rotación formal de claves.
- Falta test de contexto ausente en middleware.
- Falta test de tenant mismatch en `syncOfflineTimeLog`.
- ~~Falta guard backend por módulo para `feature_matrix`~~ → **Resuelto**
- ~~Falta endpoint de capacidades por tenant~~ → **Resuelto**
- Falta test PgBouncer Transaction Pooling con pool real.

## Riesgo documental detectado

En [02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md](root/02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md:49) aparece un ejemplo con `authHeader.split(' ')[25]`, que es inconsistente con [04_MASTER_AUTENTICACION_Roles_y_Permisos.md](root/04_MASTER_AUTENTICACION_Roles_y_Permisos.md:136), donde se usa `split(' ')[1]`.

## Criterio de aceptación futuro

- Middleware de autenticación implementado.
- Tests de fuga transversal.
- Tests de contexto ausente.
- Tests de PgBouncer Transaction Pooling.
- Auditoría de logs para accesos críticos.
