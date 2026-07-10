# Skill: Kavana Manufacturing - Arquitectura General

## Propósito

Usa esta skill como punto de entrada para cualquier tarea de Kavana Manufacturing cuando no exista una skill más específica. Define el marco arquitectónico obligatorio para producto, backend, frontend, datos y seguridad. Incluye soporte para sistema de temas dual (Clásico ERP + Moderno Kavana).

## Fuentes maestras

Antes de sugerir o implementar cambios, consulta siempre los documentos maestros en `root/`:

- [`01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md`](root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md)
- [`02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md`](root/02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md)
- [`03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md`](root/03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md)
- [`04_MASTER_AUTENTICACION_Roles_y_Permisos.md`](root/04_MASTER_AUTENTICACION_Roles_y_Permisos.md)
- [`05_MASTER_CORE_Modelos_De_Datos_Produccion.md`](root/05_MASTER_CORE_Modelos_De_Datos_Produccion.md)
- [`06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md`](root/06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md)
- [`07_MASTER_ADMIN_Gobernanza_JSONB_y_CustomFields.md`](root/07_MASTER_ADMIN_Gobernanza_JSONB_y_CustomFields.md)

## Principios no negociables

1. **Aislamiento total de datos**
   - Toda tabla multi-tenant debe incluir `tenant_id BIGINT NOT NULL`.
   - Toda consulta SQL o capa de acceso a datos debe filtrar por `tenant_id`.
   - Toda clave primaria de entidades multi-tenant debe ser compuesta: `PRIMARY KEY (tenant_id, id)`.
   - Toda clave foránea compuesta debe incluir `tenant_id` para evitar cruces entre inquilinos.
   - Toda restricción `UNIQUE` debe incluir `tenant_id`.
   - Toda migración debe activar `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY`.
   - Toda política RLS debe ser Fail-Closed: si no hay `app.current_tenant_id`, no se devuelven filas.

2. **Backend seguro**
   - JWT debe validarse con RS256/JWKS.
   - El tenant_id debe provenir de claims verificados, nunca de inputs del cliente.
   - El contexto debe propagarse mediante `AsyncLocalStorage.run()`.
   - Está prohibido usar `enterWith()` para contexto de tenant.
   - En PgBouncer Transaction Pooling, usar `SET LOCAL` dentro de transacción, nunca `SET SESSION`.
   - La conexión de aplicación debe usar un rol de privilegios mínimos, sin `BYPASSRLS`.

3. **Modularidad**
   - Cada módulo nuevo debe vivir en una carpeta independiente.
   - Los módulos como OEE, Calidad y Costes deben activarse mediante `feature_matrix` JSONB.
   - Consulta siempre [`03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md`](root/03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md) antes de diseñar módulos.

4. **Frontend industrial**
   - HMI táctil con visión de túnel.
   - Botones mínimos de 64px.
   - Evitar menús anidados en pantallas de operario.
   - Offline-First con persistencia en IndexedDB/Dexie.js.
   - Toda llamada API debe usar `AbortController` con timeout de 4s.
   - **Dual Theme:** Crear variante moderna (`NombrePanel.tsx`) + variante clásica (`ClassicNombrePanel.tsx`).

5. **Resiliencia**
   - No guardar estado crítico solo en memoria volátil.
   - Las operaciones de red deben tener timeout y control de errores.
   - Las colas de eventos deben ser FIFO y persistentes.
   - La sincronización debe ser idempotente mediante IDs de cliente.

## Checklist obligatorio antes de entregar código

- [ ] He leído la documentación relevante de `root/`.
- [ ] Todas las entidades multi-tenant incluyen `tenant_id`.
- [ ] Todas las consultas incluyen `tenant_id` en el filtro.
- [ ] Las claves primarias, índices y restricciones de unicidad empiezan por `tenant_id`.
- [ ] Las migraciones incluyen RLS activado y forzado.
- [ ] El backend usa contexto transaccional seguro.
- [ ] Los módulos nuevos respetan feature flags JSONB.
- [ ] El frontend respeta UX táctil 64px y Offline-First.
- [ ] Las llamadas API usan `AbortController` con timeout 4s.
- [ ] **Documentation Loop:** Cada cambio de código tiene documentación asociada (roadmap, decisions-log, technical docs, changelog).

## Documentation Loop (OBLIGATORIO)

**Regla:** Un cambio sin documentación es un cambio incompleto.

Después de cada cambio de código que pase tests, actualizar documentación en este orden:
1. `docs/roadmap.md` — Estado de fase y conteo de tests.
2. `docs/decisions-log.md` — Si hubo decisión técnica.
3. `docs/technical/XX_<doc-afectado>.md` — Documento técnico afectado.
4. `docs/audit/changelog.md` — Si es funcionalidad nueva.
5. `docs/commercial/*.md` — Si afecta valor de negocio.
6. `CONTRIBUTING.md` — Si se introdujeron nuevas convenciones.

## Resultado esperado

Cualquier salida de esta skill debe producir código, arquitectura o recomendaciones alineadas con Kavana Manufacturing: multi-tenant hermético, modularidad JSONB, HMI industrial Offline-First y seguridad Fail-Closed.
