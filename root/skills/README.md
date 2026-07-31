# RooCode Skills para Kavana Manufacturing

Este directorio contiene skills especializadas para RooCode. Cada skill está diseñada para reforzar un área concreta del contrato arquitectónico de Kavana Manufacturing.

## Estado del documento

- **Última actualización:** 2026-07-04. Documentación actualizada con Fase 5.5.

## Skills disponibles

1. [`kavana-v3-architecture-skill.md`](kavana-v3-architecture-skill.md)
   - Skill general de arquitectura. Úsala cuando no exista una skill más específica.

2. [`kavana-v3-infra-postgresql-rls-skill.md`](kavana-v3-infra-postgresql-rls-skill.md)
   - PostgreSQL 16, multi-tenancy, RLS, índices y migraciones.

3. [`kavana-v3-backend-auth-rls-skill.md`](kavana-v3-backend-auth-rls-skill.md)
   - Backend NestJS/Node.js, JWT, PgBouncer, AsyncLocalStorage y transacciones.

4. [`kavana-v3-modularidad-feature-flags-skill.md`](kavana-v3-modularidad-feature-flags-skill.md)
   - Módulos nuevos, feature_matrix JSONB, feature flags y caché.

5. [`kavana-v3-admin-jsonb-customfields-skill.md`](kavana-v3-admin-jsonb-customfields-skill.md)
   - Panel de administración, gobernanza JSONB y custom fields.

6. [`kavana-v3-core-mes-production-skill.md`](kavana-v3-core-mes-production-skill.md)
   - Core MES: workstations, production_orders, production_time_logs y máquina de estados.

7. [`kavana-v3-frontend-hmi-offlinefirst-skill.md`](kavana-v3-frontend-hmi-offlinefirst-skill.md)
   - HMI táctil, Zustand, Dexie.js, IndexedDB, cola FIFO y API con timeout 4s.

8. [`kavana-v3-qa-security-review-skill.md`](kavana-v3-qa-security-review-skill.md)
   - QA, seguridad, auditoría de Data Bleeding y pruebas de aislamiento.

9. [`kavana-v3-documentation-audit-skill.md`](kavana-v3-documentation-audit-skill.md)
   - Documentación técnica, auditoría continua y portfolio comercial. Se activa con el comando especial `$d`.

## Cómo usarlas en RooCode

- Para tareas generales, carga [`kavana-v3-architecture-skill.md`](kavana-v3-architecture-skill.md).
- Para SQL/migraciones, carga [`kavana-v3-infra-postgresql-rls-skill.md`](kavana-v3-infra-postgresql-rls-skill.md).
- Para backend, carga [`kavana-v3-backend-auth-rls-skill.md`](kavana-v3-backend-auth-rls-skill.md).
- Para frontend de operario, carga [`kavana-v3-frontend-hmi-offlinefirst-skill.md`](kavana-v3-frontend-hmi-offlinefirst-skill.md).
- Para revisión de seguridad, carga [`kavana-v3-qa-security-review-skill.md`](kavana-v3-qa-security-review-skill.md).
- Para documentar, auditar y mantener trazabilidad del proyecto, usa el comando especial `$d`; la skill encargada es [`kavana-v3-documentation-audit-skill.md`](kavana-v3-documentation-audit-skill.md).

Todas las skills deben respetar el contrato global definido en [`../.clinerules`](../.clinerules).
