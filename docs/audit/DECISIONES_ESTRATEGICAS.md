# Decisiones Estratégicas y Arquitectónicas (Kavana Manufacturing)

Este documento registra el "por qué" de las decisiones clave de arquitectura e implementación.

## 2026-07-03 - Dual Theme System (Clásico + Moderno)

### 1. Sistema de temas dual con toggle flotante
**Decisión:** Implementar dos estilos visuales (Clásico ERP + Moderno Kavana) con toggle flotante y persistencia en localStorage.
**Por qué:** Los usuarios industriales tienen preferencias diversas — supervisores veteranos prefieren ERP clásico, operarios jóvenes prefieren interfaces modernas. Un solo tema alienaría a una parte significativa de usuarios.
**Alternativas evaluadas:**
- Solo tema moderno → Descartada: alienaría usuarios tradicionales
- Solo tema clásico → Descartada: perdería ventaja visual competitiva
- Temas por rol → Descartada: inflexible, no permite elección personal

### 2. 6 componentes UI (3 modernos + 3 clásicos)
**Decisión:** Crear variante clásica para cada panel (Operator, Admin, Supervisor) manteniendo el mismo Zustand store.
**Por qué:** El theme toggle no debe perder estado de negocio. Zustand store compartido garantiza que cambiar de tema no pierde datos.
**Consecuencia:** 2x componentes UI, pero共享 lógica de negocio. Mantenimiento adicional pero mayor adopción.

### 3. Theme toggle flotante bottom-right
**Decisión:** Floating button para cambio en tiempo real sin navegar.
**Por qué:** El usuario no debe perder contexto visual para cambiar de tema. Botón flotante siempre visible pero no intrusivo.

## 2026-07-03 - Panel de Supervisor con CRUD de Órdenes

### 1. CRUD simple para supervisor
**Decisión:** Implementar create/list/update/delete para órdenes de producción.
**Por qué:** El supervisor necesita gestionar órdenes sin depender del administrador. Empezar con CRUD simple permite validar la arquitectura antes de añadir workflow complejo.
**Lección:** El supervisor es un usuario intermedio — no necesita la complejidad del admin ni la simplicidad del operario.

## 2026-06-17 - Orquestación Roo Code <-> NotebookLM con `tools-ai/`

### 1. Módulo local para interconexión bidireccional inter-IA

**Decisión:** Crear `tools-ai/notebooklm/` como módulo interno de automatización local con Chrome DevTools Protocol, Playwright y un perfil aislado de Chrome en `localhost:9222`.

**Por qué:** NotebookLM se incorpora como motor activo de síntesis de contexto, razonamiento de mercado y generación de artefactos profundos para Kavana Manufacturing. Roo Code actúa como piloto local que prepara contexto, acciona artefactos y extrae Markdown a `docs/ai/outputs/`, cerrando el ciclo Roo Code <-> NotebookLM sin tocar backend, frontend ni database.

**Riesgos controlados:** robustez de selectores ante cambios de UI de Google mediante `get_by_text`/`get_by_role`, aislamiento del perfil de Chrome para no interferir con el navegador diario, y CDP estrictamente local en `127.0.0.1:9222`.

**Trazabilidad:** la decisión completa está documentada en [`docs/ai/00_orquestacion_arquitectura_ia.md`](docs/ai/00_orquestacion_arquitectura_ia.md:1).

## 2026-06-19 - NotebookLM Bridge V3: cuaderno permanente, fuentes temporales y Human-in-the-Loop

### 1. Reutilización de cuaderno permanente

**Decisión:** El flujo V3 deja de crear cuadernos o subir archivos locales en cada ciclo. `notebook_bridge.py` reutiliza el cuaderno permanente de Kavana Manufacturing `https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79`, mantiene fuentes estructurales sincronizadas desde Drive y solo inyecta fuentes externas temporales bajo demanda.

**Por qué:** Reduce ruido, evita duplicidad de cuadernos y respeta el límite de fuentes de NotebookLM. La fuente de verdad estructural permanece en el repositorio y en Drive; NotebookLM actúa como motor de síntesis temporal.

### 2. Ingesta temporal y limpieza controlada

**Decisión:** Añadir `--add-source-url` para fuentes externas temporales y `--clean-temp-sources` para eliminarlas tras aprobación e implementación local.

**Por qué:** Permite investigar documentación externa, por ejemplo PgBouncer o RLS, sin contaminar permanentemente el cuaderno. La limpieza solo elimina URLs registradas como temporales, preservando fuentes oficiales de Drive.

### 3. Parada Human-in-the-Loop

**Decisión:** Cada extracción genera Markdown y manifiesto con `requires_confirmation_before_code_changes: true`. Roo Code debe detenerse y esperar `procede` antes de modificar código.

**Por qué:** Evita bucles de automatización y decisiones de código basadas únicamente en síntesis de NotebookLM. La implementación solo procede tras validación humana explícita.

## 2026-06-17 - Fase 5.4: Custom Fields en Runtime (Backend + Admin)

### 1. Validación dinámica con Zod `.strict()` en lugar de Ajv
**Decisión:** Construir el esquema Zod dinámicamente en `createOrder` mapeando los tipos del `custom_fields_schema` del tenant y aplicando `.strict()` para rechazar campos no declarados.
**Por qué:** Zod ya está instalado y se usa en toda la capa de DTOs. Añadir Ajv duplicaría la responsabilidad de validación sin beneficio. `.strict()` es la forma más Ponytail de bloquear propiedades sobrantes: una sola llamada, cero config adicional.

### 2. Meta-validación del esquema admin con Zod estático
**Decisión:** Antes de persistir el `custom_fields_schema` propuesto por el admin, validar su estructura con un esquema Zod estático (`CustomFieldsSchemaValidator`) que exige `{ fields: [{ key: regex, type: enum, required: bool }] }`.
**Por qué:** Un JSON corrupto en `custom_fields_schema` rompe en cascada toda la validación dinámica. La meta-validación actúa como "guardián de guardianes": si el esquema del admin no pasa, nunca llega a la BD y nunca puede envenenar el runtime.

### 3. Freno de cuota en la capa de servicio, no en la BD
**Decisión:** El control de `max_custom_fields` se hace en `TenantCapabilitiesService` comparando `fields.length` contra la cuota antes de persistir.
**Por qué:** Un CHECK constraint en PostgreSQL no puede contar llaves de un JSONB de forma dinámica por tenant. La capa de servicio ya tiene acceso a las cuotas via `getCapabilities()` y puede dar un error descriptivo al admin.

### 4. Editor visual en Admin Panel con sanitización inline
**Decisión:** El editor de campos personalizados sanitiza las llaves en tiempo real (`toLowerCase().replace(...)`) y valida duplicados antes de enviar al backend.
**Por qué:** El operario de fábrica (o el admin que no es técnico) no debe poder crear llaves con espacios, mayúsculas o caracteres especiales. Sanitizar inline evita errores en el backend y mejora la UX industrial.

## 2026-06-17 - Saneamiento de Arquitectura HMI (Fase 5.3 consolidada)

### 1. Decodificación nativa de JWT en cliente y eliminación de DEMO_TENANT_ID
**Decisión:** En lugar de acoplar librerías de terceros (como `jwt-decode`) o usar ids demo fijos en componentes, decodificamos el JWT dinámicamente mediante código nativo en `hmi-store.ts` utilizando la API `atob`.
**Por qué:** Filosofía Ponytail (YAGNI / Zero dependencies). Para extraer dos strings de un payload de JWT no se justifica añadir una dependencia que deba descargarse, actualizarse y auditarse. Al mismo tiempo, nos desacoplamos de constantes de demostración hardcodeadas preparándonos de forma segura para RLS real.

### 2. Tabla de caché offline de capacidades (`tenantConfig`) en Dexie.js
**Decisión:** Crear una tabla en IndexedDB dedicada para las capacidades del tenant y sus esquemas dinámicos, actualizándola en cada petición online con éxito.
**Por qué:** Resiliencia offline-first. El operario de fábrica no puede perder el control de su pantalla táctil ante micro-cortes de red. Persistir la configuración en IndexedDB en lugar de la memoria volátil de React nos asegura que si recarga el navegador sin conexión, el HMI sepa qué módulos y campos dinámicos de validación usar.

## 2026-06-16 - Fase 5.2: Backend de Capacidades

### 1. Caché L1 en memoria (Sin Redis)
**Decisión:** Usar `Map` nativo de JS con TTL y validación de `governance_version` en lugar de Redis.
**Por qué:** Filosofía Ponytail (YAGNI). Para un MVP single-process, añadir Redis complica la infraestructura local, añade latencia y requiere mantenimiento adicional. El upgrade path a Redis L2 queda documentado para cuando haya múltiples instancias.

### 2. Guard Genérico con APP_GUARD
**Decisión:** Registrar `RequireFeatureGuard` de forma global pero solo bloquear si existe el decorador `@RequireFeature`.
**Por qué:** Evita tener que inyectar el guard manualmente en cada controller futuro. Al fallar en abierto (si no hay decorador), no rompemos endpoints públicos como `/health`.

### 3. Fail-safe para módulos desconocidos
**Decisión:** Hardcodear `KNOWN_MODULE_KEYS` en el servicio y devolver `false` si se pide un módulo no registrado.
**Por qué:** Evita que un error tipográfico en el decorador (ej. `@RequireFeature('oee_mointoring')`) permita el acceso. Un módulo desconocido siempre se asume sin licencia.

## 2026-06-16 - Fase 5.3: Panel Tenant Admin

### 1. Routing Frontend Zero-Dependencies
**Decisión:** No usar `wouter` ni `react-router-dom`. El enrutamiento se hace leyendo directamente `window.location.pathname`.
**Por qué:** Durante la instalación, npm falló por un bug conocido con los workspaces y lockfiles. Para no bloquear el desarrollo ni añadir fricción, se optó por un router nativo. Cumple con la filosofía "lazy but efficient" de Ponytail: menos dependencias, menos peso, 0 configuración.

### 2. Mutación de Capacidades Transaccional
**Decisión:** El método `toggleModule` ejecuta el `UPDATE` con `jsonb_set` y el `INSERT` de la auditoría dentro del mismo bloque `BEGIN/COMMIT`.
**Por qué:** Es imperativo que cualquier cambio de configuración en el MES quede registrado. Si el log de auditoría falla, el cambio de capacidad debe fallar también. Compliance industrial ante todo.

### 3. Bug Vite Proxy — Análisis para próxima sesión
**Síntoma:** `fetch('/tenant/capabilities')` desde el frontend devuelve `index.html` en vez de hacer proxy al backend `:3001`.
**Contexto:** El backend responde correctamente con JSON vía `curl -H "Authorization: Bearer mock-token" http://localhost:3001/tenant/capabilities`. El proxy está en `vite.config.ts` como `'/tenant': 'http://localhost:3001'`.
**Hipótesis:** Vite prioriza el SPA fallback (devolver `index.html` para cualquier ruta no encontrada) sobre las reglas del proxy cuando la ruta coincide con un pathname del frontend (como `/admin`). Posibles soluciones:
  1. Prefijo API: Cambiar el controller de `@Controller('tenant')` a `@Controller('api/tenant')` y actualizar proxy y frontend.
  2. Configuración Vite: Usar la forma extendida del proxy con `changeOrigin: true` y posiblemente desactivar el SPA fallback para rutas `/tenant`.
  3. Orden de prioridad: Verificar si el problema es que Vite HMR middleware intercepta antes que http-proxy.

---

## 2026-07-04 - OEE como módulo opcional + Manufacturing Models refactor

### 1. `estimated_minutes` eliminado, reemplazado por `unit_of_measure` + `target_rate`
**Decisión:** Eliminar `estimated_minutes` (NOT NULL, siempre visible) y reemplazarlo por `unit_of_measure` (enum nullable) y `target_rate` (NUMERIC nullable).
**Por qué:** `estimated_minutes` asumía que todos los tenants necesitan cálculo de eficiencia, pero OEE es un módulo premium. Los campos que pertenecen a un módulo específico nunca deben ser visibles ni requeridos en el paquete base.

### 2. UI condicional según módulo activo
**Decisión:** El frontend consulta `fetchCapabilities()` y solo renderiza los campos de unidad/meta si `oee_monitoring.enabled === true`. Las columnas de la tabla también se ocultan.
**Por qué:** Si el módulo está desactivado, mostrar los campos confunde al usuario y viola YAGNI. La UI debe adaptarse dinámicamente a los módulos activos del tenant.

### 3. Columnas nullable en DB
**Decisión:** `unit_of_measure` y `target_rate` son nullable. No tienen default. Se envían solo si OEE activo.
**Por qué:** Un default automático (ej: `piezas/h`) crearía datos fantasma en tenants que no usan OEE. Nullable = sin datos basura.
