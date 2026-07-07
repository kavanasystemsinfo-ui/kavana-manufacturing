# Kavana V3 - Roadmap Maestro de Construcción

## Estado del documento

- **Estado:** Roadmap maestro activo. Unificación completada. Guías de usuario en 8 paneles. Graphify integrado. 185 tests pass.
- **Última actualización:** 2026-07-07.
- **Fase actual:** Hardening — type casting SQL, diagnóstico tsx watch Windows, password hashes.

## Propósito

Este documento define el orden real de construcción de Kavana V3. Sirve como guía operativa para avanzar paso a paso, evitando construir frontend, módulos premium o pantallas comerciales antes de tener una base segura multi-tenant.

## Principio rector

Kavana V3 se construirá desde la seguridad hacia la experiencia:

1. Aislamiento de datos.
2. Backend seguro.
3. Core MES vertical.
4. HMI offline-first.
5. Administración y modularidad.
6. **Dual Theme (Clásico + Moderno).**
7. Módulos premium.
8. Hardening y portfolio comercial.

## Fase actual

La fase actual es **Supervisor Panel Rewrite + ClassicAdminPanel V2 Users** (completada).

## Próximo hito inmediato

Proyecto listo para producción. Próximos pasos opcionales:
- Deploy a staging/producción
- Demo funcional con datos reales
- Iteración basada en feedback de clientes

1. **Completado: Fase 5.1 - Esquema de gobernanza de tenant**
   - `tenants` consolidada con `feature_matrix JSONB`.
   - `custom_fields_schema JSONB` separado.
   - `hard_limits JSONB` separado de cuotas editables.
   - `governance_version` para invalidación de caché.
   - Auditoría de cambios críticos en `tenant_config_audit`.
   - Validado con `npm run database:smoke` contra PostgreSQL 18 en Docker.
2. **Completado: Fase 5.2 - Backend de capacidades**
   - Endpoint `GET /tenant/capabilities` de lectura de capacidades por tenant.
   - Guard global `@RequireFeature('module_key')` por módulo.
   - Validación de `feature_matrix` con `KNOWN_MODULE_KEYS`.
   - Caché L1 en memoria con TTL 60s e invalidación por `governance_version`.
   - Evidencia: [`backend/src/tenant-capabilities/`](backend/src/tenant-capabilities/tenant-capabilities.module.ts:1).
   - Tests: 8 tests de caché L1, evaluación de módulos y guard.
3. **Completado: Fase 5.3 - Panel Tenant Admin**
   - Nuevo endpoint backend `PATCH /tenant/capabilities/modules/:moduleKey`.
   - Protección RBAC con `@RequireRole('tenant_admin')`.
   - Mutación de `jsonb_set` y logs de `tenant_config_audit`.
   - UI de administrador de capacidades en Frontend (`/admin`).
4. **Completado: Fase 5.4 - Custom fields en runtime + Dual Theme**
   - ✅ Meta-validación Zod del esquema admin con `CustomFieldsSchemaValidator`.
   - ✅ Freno de cuota `max_custom_fields` en backend.
   - ✅ Validación dinámica Zod `.strict()` en `createOrder`.
   - ✅ Editor visual de campos personalizados en Admin Panel.
   - ✅ API frontend `updateCustomFieldsSchema` con timeout 4s.
   - ✅ Tests: `custom-fields-validation.spec.ts` (3) + `custom-fields-governance.spec.ts` (3).
   - ✅ Renderizado dinámico de Custom Fields en `OperatorPanel.tsx` con `mapCustomFieldsToUI`.
   - ✅ Dual Theme: Classic ERP + Moderno Kavana con toggle flotante.
   - ✅ 138 tests passing.
   - ✅ Build exitoso.
   - ✅ Tipado fuerte (`ProductionOrder`), selectores Zustand optimizados, renderizado condicional por tipo.
   - ✅ Tests: `customFieldsMapper.spec.ts` (4 tests, 3 escenarios + null safety).

5. **Completado: Auditoría Inversa y Blindaje Escudo Industrial**
   - ✅ Entornos unificados bajo identidad Pro Autónoma (Roo Code / Antigravity).
   - ✅ Cobertura del 100% en lógica de negocio (Backend controllers, Guards).
   - ✅ Cobertura del 100% en HMI Store (Zustand) y cliente API.
   - ✅ Vitest en Verde Absoluto (40 tests funcionales superados).

## Fases completadas

- Fase 0 - Ordenación del proyecto y trazabilidad documental.
- Fase 1 - Cimientos SaaS y aislamiento multi-tenant.
- Fase 2 - Backend mínimo seguro.
- Fase 3 - Core MES vertical.
- Fase 4 - HMI táctil offline-first.
- Fase 5.1 - Esquema de gobernanza de tenant.
- Fase 5.2 - Backend de capacidades y feature flags.
- Fase 5.3 - Panel Tenant Admin.
- Fase 5.4 (parcial) - Custom fields backend + admin panel.
- Fase 5.5 - Guías de usuario + Manufacturing Models refactor.
- Fase 5.6 - Global Theme Toggle (Zustand store centralizado).
- Fase 6 - QA, seguridad y automatización (168 tests, ESLint, PR checklist).
- Fase 7 - Módulos premium (OEE, Quality, Cost — 178 tests total).
- Fase 8 - Hardening y portfolio comercial.
- Fase 9 - Integración real (Quality/Cost dashboards, 178 tests).
- Fase 10 - Hardening final (179 tests).
- Fase 11 - Global Admin (CRUD tenants, subdomain login, 179 tests).
- Fase 12 - Auth + Subdomain Login (JWT HMAC+RS256, TenantContextMiddleware, 180 tests).
- Fase 13 - Custom Fields Editables (PATCH endpoint, label support, 185 tests).
- Operator Context - Nombres reales en panel HMI (GET /production/operator/context, workstationName + operatorName, 185 tests).
- Order Selection - Selección de orden con búsqueda (GET /orders/available, pantalla de selección, 185 tests).
- Tests iniciales de transiciones, DTO offline y cola IndexedDB.

## Roadmap por fases

---

## Fase 0 - Ordenación del proyecto y trazabilidad documental

### Objetivo

Dejar el repositorio preparado para construir con trazabilidad, documentación y auditoría continua.

### Entregables

- Roadmap maestro.
- Skill `$d`.
- Estructura `docs/technical`.
- Estructura `docs/commercial`.
- Estructura `docs/audit`.
- Changelog documental.
- Auditoría inicial.

### Criterios de salida

- Existe un roadmap maestro.
- `$d` actualiza documentación y auditoría.
- Cada fase tiene documentación asociada.
- El estado del proyecto puede auditarse sin depender de memoria conversacional.

### Checkpoint `$d`

- Revisar [`ROADMAP.md`](ROADMAP.md:1).
- Actualizar [`docs/audit/changelog.md`](docs/audit/changelog.md:1).
- Registrar avances, bloqueos y deuda técnica.

---

## Fase 1 - Cimientos SaaS y aislamiento multi-tenant

### Objetivo

Crear la base de datos segura que permita existir a tenants, usuarios, roles y políticas RLS.

### Entregables técnicos

- Migración `tenants`.
- Campo `feature_matrix JSONB`.
- Migración `users`.
- Roles:
  - `super_admin`
  - `tenant_admin`
  - `supervisor`
  - `operario`
- Rol de base de datos `kavana_app`.
- Función `get_current_tenant()`.
- Políticas RLS Fail-Closed.
- Índices liderados por `tenant_id`.
- Tests de aislamiento.

### Documentos relacionados

- [`docs/technical/01_multi-tenancy-rls-audit.md`](docs/technical/01_multi-tenancy-rls-audit.md:1).
- [`docs/technical/02_backend-auth-context.md`](docs/technical/02_backend-auth-context.md:1).

### Criterios de salida

- Un tenant puede crearse.
- Un usuario pertenece a un tenant.
- Una consulta sin `app.current_tenant_id` devuelve cero filas.
- Un usuario del tenant A no puede leer datos del tenant B.
- Todas las tablas multi-tenant tienen RLS activado y forzado.

### Riesgos críticos

- Data Bleeding por falta de `tenant_id`.
- Índices únicos globales.
- RLS sin `FORCE ROW LEVEL SECURITY`.
- Rol de aplicación con privilegios excesivos.

---

## Fase 2 - Backend mínimo seguro

### Objetivo

Crear una API NestJS/Node capaz de autenticar, propagar contexto y ejecutar transacciones seguras.

### Entregables técnicos

- Estructura backend.
- Validación JWT RS256/JWKS.
- Extracción de `tenant_id` desde claims firmados.
- `AsyncLocalStorage.run()`.
- Prohibición de `enterWith()`.
- Interceptor transaccional con `SET LOCAL`.
- Guards de roles.
- Health checks.
- Tests de contexto ausente.
- Tests de fuga transversal.
- Tests de PgBouncer Transaction Pooling.

### Documentos relacionados

- [`docs/technical/02_backend-auth-context.md`](docs/technical/02_backend-auth-context.md:1).
- [`docs/technical/07_security-qa-audit.md`](docs/technical/07_security-qa-audit.md:1).

### Criterios de salida

- El backend no confía en `tenant_id` del body, query o headers no firmados.
- Cada transacción inyecta `app.current_tenant_id` con `SET LOCAL`.
- No existe `SET SESSION`.
- No existe `AsyncLocalStorage.enterWith()`.
- Los errores de acceso transversal no enumeran datos.

### Riesgos críticos

- Fuga de contexto en Node.js.
- Contaminación de conexión en PgBouncer.
- JWT mal validado.
- Errores que revelan existencia de recursos ajenos.

---

## Fase 3 - Core MES vertical

### Objetivo

Construir el flujo mínimo real de producción: puestos, órdenes, transiciones y logs de tiempos.

### Entregables técnicos

- Migración `workstations`.
- Migración `production_orders`.
- Migración `production_time_logs`.
- Revisión de la migración actual [`root/core-mes-production/001_production_orders.sql`](root/core-mes-production/001_production_orders.sql:1).
- Máquina de estados.
- Servicio backend de transiciones.
- Logs lineales.
- Tests de transiciones inválidas.

### Documentos relacionados

- [`docs/technical/04_core-mes-production.md`](docs/technical/04_core-mes-production.md:1).

### Flujo vertical objetivo

1. Supervisor crea un puesto de trabajo.
2. Supervisor crea una orden.
3. Operario envía parte de trabajo (horas y producción) mediante el HMI.
4. El backend valida solapamientos temporales del operario.
5. El bloque se registra en `production_work_blocks`.
6. La orden actualiza automáticamente sus piezas producidas y mermas.

### Criterios de salida

- No se puede pausar una orden que no está en marcha.
- No se puede finalizar una orden pendiente.
- No se puede modificar una orden terminada.
- Toda transición genera un log.
- Toda transición se ejecuta en una transacción segura.
- Toda entidad está aislada por `tenant_id`.

### Riesgos críticos

- Corrupción de estados.
- Logs duplicados.
- Eventos fuera de orden.
- FK simples entre entidades multi-tenant.

---

## Fase 4 - HMI táctil offline-first

**Estado:** Completada.

### Objetivo

Crear la interfaz de operario como experiencia táctil, resiliente y sincronizable.

### Entregables técnicos

- Estructura frontend.
- React + Tailwind.
- HMI de visión de túnel táctil con formulario asíncrono.
- Componentes de entrada de horas y cantidades.
- Zustand store.
- Dexie.js / IndexedDB (`offlineBlocks`).
- Cola FIFO.
- Sincronizador.
- Dead-letter storage.
- API calls con `AbortController` y timeout de 4s.
- Estados visuales: pendiente, en marcha, pausado, terminado, offline, sincronizando.

### Documentos relacionados

- [`docs/technical/05_frontend-hmi-offline-first.md`](docs/technical/05_frontend-hmi-offline-first.md:1).

### Criterios de salida

- El operario puede iniciar, pausar y finalizar sin depender de red.
- Los eventos persisten si se recarga la página.
- La sincronización respeta FIFO.
- Los reintentos no duplican logs.
- Los conflictos 400 se mueven a dead-letter storage.
- Las llamadas API expiran a los 4s.

### Evidencia de salida

- Frontend HMI mínimo implementado en [`frontend/src/App.tsx`](frontend/src/App.tsx:1).
- Cliente API con timeout en [`frontend/src/api/client.ts`](frontend/src/api/client.ts:1).
- Cola IndexedDB/Dexie en [`frontend/src/db/local-db.ts`](frontend/src/db/local-db.ts:1).
- Store y sincronizador offline-first en [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:1).
- Endpoint backend de sincronización offline en [`backend/src/core-mes-production/core-mes-production.controller.ts`](backend/src/core-mes-production/core-mes-production.controller.ts:34).
- Tests de cola offline en [`frontend/src/db/local-db.spec.ts`](frontend/src/db/local-db.spec.ts:1).

### Riesgos críticos

- Estado crítico solo en memoria.
- Doble clic no bloqueado.
- Sincronización concurrente.
- API sin timeout.
- Eventos offline duplicables.

---

## Fase 5 - Administración, feature flags y custom fields

### Objetivo

Permitir configuración real por cliente y activación modular de funcionalidades sin comprometer la seguridad, la trazabilidad ni la estabilidad del core MES.

### Entregables técnicos

- Panel Tenant Admin.
- Activación/desactivación de módulos.
- Validación backend de `feature_matrix`.
- Custom fields.
- Validación dinámica con Zod/Ajv.
- Caché L1/L2 para `feature_matrix`.
- Invalidación de caché.
- Auditoría de cambios críticos.

### Plan detallado de ejecución

#### Fase 5.1 - Esquema de gobernanza de tenant

- **Estado:** Completada.
- Consolidar la tabla `tenants`.
- Añadir `feature_matrix JSONB NOT NULL DEFAULT`.
- Añadir `custom_fields_schema JSONB NOT NULL DEFAULT`.
- Separar límites editables y límites duros.
- Crear semilla inicial por tenant.
- Crear migración de auditoría para cambios críticos.
- Proteger todos los cambios con `tenant_id` y RLS.
- Evidencia: [`database/migrations/005_tenant_governance.sql`](database/migrations/005_tenant_governance.sql:1).
- Evidencia: [`database/tests/002_tenant_governance_smoke.sql`](database/tests/002_tenant_governance_smoke.sql:1).

#### Fase 5.2 - Backend de capacidades y feature flags

- **Estado:** Completada.
- Endpoint `GET /tenant/capabilities` implementado en [`tenant-capabilities.controller.ts`](backend/src/tenant-capabilities/tenant-capabilities.controller.ts:1).
- Guard global `@RequireFeature()` implementado en [`require-feature.guard.ts`](backend/src/tenant-capabilities/require-feature.guard.ts:1).
- Servicio con caché L1 implementado en [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:1).
- Módulos desconocidos rechazados por `KNOWN_MODULE_KEYS`.
- Caché L1 en memoria con TTL 60s e invalidación por `governance_version`.
- Módulo global `@Global()` en [`tenant-capabilities.module.ts`](backend/src/tenant-capabilities/tenant-capabilities.module.ts:1).
- 8 tests unitarios en [`tenant-capabilities.spec.ts`](backend/src/tenant-capabilities/tenant-capabilities.spec.ts:1).

#### Fase 5.3 - Panel Tenant Admin

- **Estado:** Completada.
- Endpoint `PATCH` de actualización implementado con SQL (`jsonb_set`) en [`tenant-capabilities.service.ts`](backend/src/tenant-capabilities/tenant-capabilities.service.ts:1).
- Routing minimalista Frontend (Operario vs Admin) en [`App.tsx`](frontend/src/App.tsx:1).
- Interfaz gráfica de conmutación de módulos en [`TenantAdminPanel.tsx`](frontend/src/TenantAdminPanel.tsx:1).
- Auditoría automática en `tenant_config_audit`.
- Mostrar estado de activación por módulo.
- Evitar formularios excesivos y mantener UX industrial.
- Condicionar rutas por capacidades recibidas del backend.

#### Fase 5.4 - Custom fields en runtime

- Bootstrapear esquema de custom fields al arranque.
- Renderizar campos según tipo: texto, número, fecha, booleano y select.
- Aplicar validación required, min, max y pattern.
- Persistir valores en payloads del core MES.
- Rechazar campos no declarados.
- Registrar cambios críticos en auditoría.
- Mantener compatibilidad con HMI offline-first.

### Documentos relacionados

- [`docs/technical/03_feature-flags-modularity.md`](docs/technical/03_feature-flags-modularity.md:1).
- [`docs/technical/06_admin-governance-custom-fields.md`](docs/technical/06_admin-governance-custom-fields.md:1).
- [`docs/technical/07_security-qa-audit.md`](docs/technical/07_security-qa-audit.md:1).

### Criterios de salida

- Un tenant puede configurar campos personalizados.
- Un módulo desactivado no se renderiza.
- Un módulo desactivado no se ejecuta en backend.
- Los cambios de configuración invalidan caché.
- Tenant Admin no puede alterar límites duros.
- `feature_matrix` tiene esquema validado y semilla inicial.
- Los endpoints premium rechazan llamadas sin capacidad activa.
- La auditoría registra cambios de módulos, cuotas y esquemas.
- El HMI recibe capacidades y campos personalizados sin depender de memoria volátil.

### Riesgos críticos

- Renderizar módulos no contratados.
- Caché inconsistente.
- JSONB demasiado grande.
- Campos personalizados mal validados.
- Tenant Admin altera límites duros.
- Custom fields contaminan métricas del core MES.
- Auditoría insuficiente para cambios críticos.

### Mitigaciones esperadas

- Backend como fuente de verdad de capacidades.
- Frontend consume capacidades, no flags directos.
- Validación runtime estricta en backend.
- Límites duros protegidos por rol y backend.
- Auditoría obligatoria para cambios de configuración.
- Quotas documentadas y validadas antes de persistir.

---

## Fase 6 - QA, seguridad y automatización

### Objetivo

Convertir las reglas Kavana V3 en controles automatizados.

### Entregables técnicos

- Tests de fuga transversal.
- Tests de inserción cruzada.
- Tests de contexto ausente.
- Tests de PgBouncer.
- Tests de máquina de estados.
- Tests offline.
- Linting de migraciones SQL.
- Checklist de Pull Request.
- Auditoría documental automática con `$d`.

### Documentos relacionados

- [`docs/technical/07_security-qa-audit.md`](docs/technical/07_security-qa-audit.md:1).
- [`docs/audit/changelog.md`](docs/audit/changelog.md:1).

### Criterios de salida

- Ninguna migración puede incluir tablas multi-tenant sin RLS.
- Ninguna migración puede incluir índices únicos globales.
- Ningún backend puede usar `SET SESSION`.
- Ningún frontend HMI puede guardar eventos críticos solo en memoria.
- Cada `$d` actualiza auditoría y roadmap.

### Riesgos críticos

- Reglas documentadas pero no automatizadas.
- Tests ausentes.
- Deuda técnica invisible.
- Falsos positivos comerciales.

---

## Fase 7 - Módulos premium

### Objetivo

Añadir valor avanzado sobre una base estable.

### Módulos

- OEE.
- Calidad.
- Costes.

### Entregables técnicos

- Carpeta independiente por módulo.
- Declaración en `feature_matrix`.
- Guards backend por módulo.
- Componentes frontend condicionados por capacidades.
- Tests por módulo.
- Documentación comercial específica.

### Documentos relacionados

- [`docs/technical/03_feature-flags-modularity.md`](docs/technical/03_feature-flags-modularity.md:1).
- [`docs/commercial/04_feature-benefits-matrix.md`](docs/commercial/04_feature-benefits-matrix.md:1).

### Criterios de salida

- El core funciona aunque un módulo premium no exista.
- Un módulo desactivado no se ejecuta.
- Un módulo activado respeta límites de tenant.
- Cada módulo tiene documentación técnica y comercial.

### Riesgos críticos

- Acoplamiento al core.
- Feature flags ignorados.
- Lógica premium ejecutada sin licencia.
- Deuda analítica por métricas mal calculadas.

---

## Fase 8 - Hardening y portfolio comercial

### Objetivo

Preparar el proyecto para presentación profesional, demo comercial y evolución productiva.

### Entregables

- Demo vertical funcional.
- Portfolio comercial actualizado.
- Resumen ejecutivo.
- One pager de venta.
- Caso de estudio.
- Arquitectura explicada para negocio.
- Checklist de hardening.
- Plan de despliegue.
- Documentación de operaciones.

### Documentos relacionados

- [`docs/commercial/00_executive-summary.md`](docs/commercial/00_executive-summary.md:1).
- [`docs/commercial/03_sales-one-pager.md`](docs/commercial/03_sales-one-pager.md:1).
- [`docs/commercial/05_architecture-for-business.md`](docs/commercial/05_architecture-for-business.md:1).

### Criterios de salida

- El proyecto puede presentarse como portfolio profesional.
- La arquitectura técnica está documentada.
- Los beneficios comerciales están trazados a capacidades reales.
- No se prometen funciones no implementadas.

---

## Regla de avance

No se avanzará a una fase superior si la fase actual no cumple sus criterios de salida.

Excepción: se puede trabajar en documentación comercial o arquitectura de una fase futura, pero no en implementación productiva.

## Guardrails heredados de V2

La carpeta [`KAVANA V3 JUNIO 2026/`](KAVANA%20V3%20JUNIO%202026/README.md:1) se usará como referencia de conocimiento, no como plano de implementación.

Reglas derivadas:

- Rescatar reglas de negocio, no copiar código completo.
- No implementar inventario FIFO en el MVP inicial.
- No implementar calidad avanzada en el MVP inicial.
- No implementar costes, OEE, mantenimiento ni IA antes del core vertical.
- No construir paneles por rol antes de tener tenant, RLS y backend seguro.
- No migrar decisiones técnicas antiguas si contradicen PostgreSQL, RLS y `tenant_id`.
- Mantener el MVP inicial centrado en tenant, usuario, puesto, orden, eventos y HMI offline.

Documento de referencia: [`docs/technical/11_lessons-from-v2-extraction.md`](docs/technical/11_lessons-from-v2-extraction.md:1).

## Integración con `$d`

Cada ejecución de `$d` debe:

1. Leer [`ROADMAP.md`](ROADMAP.md:1).
2. Identificar la fase activa.
3. Revisar si los entregables de la fase están completos.
4. Actualizar [`docs/audit/changelog.md`](docs/audit/changelog.md:1).
5. Actualizar [`docs/technical/09_technical-debt.md`](docs/technical/09_technical-debt.md:1).
6. Registrar próximos pasos.
7. No modificar código salvo petición explícita.
