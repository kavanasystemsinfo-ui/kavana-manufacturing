# DECISIONES ESTRATÉGICAS - KAVANA MANUFACTURING

Este documento registra los "por qués" detrás de las decisiones técnicas y arquitectónicas clave del proyecto, garantizando que el equipo entienda la lógica original y no revierta soluciones a problemas ya resueltos.

---

## [2026-07-03] Documentation Loop Obligatorio

### Contexto
La documentación no se estaba actualizando en tiempo real con los cambios de código. El metodología (TDD/YAGNI) implicaba documentación pero no la exigía explícitamente.

### El Problema
- `.clinerules` solo decía "Modify the global roadmap after tests pass"
- No había regla explícita para documentar decisiones técnicas, changelogs o docs comerciales
- El resultado: documentación desactualizada y trabajo de recuperación manual

### La Decisión
Añadir "Documentation Loop (OBLIGATORIO)" como paso 4 del ciclo TDD en `.clinerules`:
1. `docs/roadmap.md` — Después de cada cambio que pase tests
2. `docs/decisions-log.md` — Si hubo decisión técnica
3. `docs/technical/XX_<doc>.md` — Documento técnico afectado
4. `docs/audit/changelog.md` — Si es funcionalidad nueva
5. `docs/commercial/*.md` — Si afecta valor de negocio
6. `CONTRIBUTING.md` — Si se introdujeron nuevas convenciones

### Lección
"Un cambio sin documentación es un cambio incompleto." La documentación es parte del código, no un adicionado. Esto es lo que las consultoras IT valoran — no solo código funcionando, sino evidencia de proceso profesional.

---

## [2026-07-03] Dual Theme System (Clásico + Moderno)

### Contexto
Los usuarios de planta tienen preferencias visuales diversas:
- Supervisores veteranos prefieren estilo ERP clásico (tablas, fondos claros)
- Operarios jóvenes prefieren estilo moderno (tarjetas, fondos oscuros)
- Clientes legacy necesitan continuidad visual con sistemas anteriores

### El Problema
Un solo tema visual alienaría a una parte significativa de usuarios. Odoo y MESBook solo ofrecen un tema, lo que genera resistencia al cambio en organizaciones tradicionales.

### La Decisión
Implementar sistema de temas dual con:
- Theme state persistido en `localStorage` con key `kavana_theme`
- Floating toggle button (bottom-right) para cambio en tiempo real
- 6 componentes: 3 modernos + 3 clásicos (Operator, Admin, Supervisor)
- Routing en `App.tsx` selecciona variante según theme almacenado

### Lección
El theme toggle flotante permite al usuario elegir su estilo preferido sin navegar. La persistencia en localStorage garantiza que la preferencia se mantiene entre sesiones. Dual theme no es solo cosmético — es una decisión de UX que respeta la diversidad de usuarios industriales.

---

## [2026-07-03] Panel de Supervisor con CRUD de Órdenes

### Contexto
El supervisor necesita gestionar órdenes de producción sin depender del administrador.

### El Problema
No existía panel de supervisor — solo había operario y administrador. El supervisor necesitaba crear, listar, actualizar y eliminar órdenes.

### La Decisión
Implementar panel de supervisor con:
- Backend: NestJS module con Zod DTOs, raw PostgreSQL queries
- Frontend: Zustand store compartido, API client con timeout 4s
- Seguridad: `WHERE tenant_id = $1` en todos los queries
- Tests: 20 tests en `orders.spec.ts`

### Lección
Empezar con CRUD simple (create/list/update/delete) permite validar la arquitectura antes de añadir workflow complejo. El supervisor es un usuario intermedio — no necesita la complejidad del admin ni la simplicidad del operario.

---

## [2026-07-03] @Inject() obligatorio para controladores NestJS bajo tsx

### Contexto
El backend NestJS se ejecuta bajo `tsx watch` durante desarrollo para hot-reload. tsx tiene una limitación conocida con decoradores TypeScript.

### El Problema
`tsx watch` no emite `emitDecoratorMetadata` correctamente. Sin metadata de decoradores, NestJS no puede resolver dependencias automáticamente vía DI. Los controladores que dependen de servicios (UsersService, WorkstationsService, etc.) fallan con errores de "undefined" en tiempo de ejecución.

### La Decisión
Todos los controladores NestJS DEBEN usar `@Inject(ServiceClass)` explícito en el constructor:
```typescript
// ✅ Correcto
constructor(
  @Inject(UsersService) private readonly usersService: UsersService,
) {}

// ❌ Incorrecto (falla bajo tsx watch)
constructor(private readonly usersService: UsersService) {}
```

### Alcance
- UsersController
- WorkstationsController
- ManufacturingModelsController
- OrdersController
- **Todos los controladores futuros**

### Lección
`tsx watch` es excelente para hot-reload pero tiene limitaciones conocidas con decoradores TypeScript. El patrón `@Inject(ServiceClass)` es la forma segura de inyectar dependencias NestJS cuando se ejecuta bajo tsx. Esto no afecta producción (ts-node/compilado sí emite metadata correctamente).

---

## [2026-06-21] Robustez en el Offline-First y Manejo de Errores

### 1. Filtro Global Zod (`ZodFilter`)
**Contexto:** Cuando el Frontend (o herramientas como cURL/Postman) enviaban un JSON inválido según nuestros esquemas estrictos de Zod (ej. un `tenant_id` string en vez de número, o falta de `downtime_reason` al pausar), NestJS interceptaba el `ZodError` por defecto y lo encapsulaba en un opaco `{"message":"Bad Request","statusCode":400}`.
**El Problema:** Esto dejaba ciegos a los desarrolladores y al Frontend, ocultando qué campo falló exactamente, lo cual es inaceptable para una UI que debe indicarle al operario cómo corregir su acción.
**La Decisión:** Se creó e inyectó un `ZodFilter` global en `main.ts` que atrapa cualquier `ZodError` y aplana sus `issues` en un array descriptivo (ej: `["downtime_reason: is required when event_type is pause"]`), de modo que el error sea 100% legible y mapeable.

### 2. Propagación Limpia de Errores en la Capa de Servicio
**Contexto:** Al realizar transacciones dentro de `withTenantTransaction` (ej. `syncOfflineTimeLog`), si la lógica de negocio lanzaba un error (ej. `throw new Error('A start event can only be applied to a pending order')`), el `.catch` del servicio lo envolvía genéricamente como `throw new BadRequestException(error.message)`.
**El Problema:** Debido a la firma interna de `BadRequestException` en NestJS, inyectar un string en el constructor, sin formateo previo, causaba que el JSON final de respuesta se enviara sin la propiedad `error` y sin el detalle real del string, devolviendo el mismo genérico `{"message": "Bad Request", "statusCode": 400}`.
**La Decisión:** Añadimos un bloque específico `if (error instanceof BadRequestException) throw error;` para respetar excepciones arrojadas explícitamente y permitir que fluyan intactas hasta el cliente. Esto garantiza que las alertas y fallos en IndexedDB (Dexie) reciban el motivo exacto del rechazo desde la base de datos o desde el estado de la máquina.

### 3. Abandono de `concurrently` por `start-dev.bat` Separado
**Contexto:** El script `npm run dev` raíz utilizaba `concurrently` para orquestar el Frontend y Backend simultáneamente en una misma terminal.
**El Problema:** Durante bloqueos catastróficos del Backend (como un `ECONNREFUSED` a PostgreSQL o un `SyntaxError` mortal que tumbe el proceso de Node), `concurrently` terminaba todos los procesos hijos, arrastrando al Frontend y borrando el historial de la consola, lo que impedía diagnosticar el motivo original del colapso.
**La Decisión:** Restauramos la estrategia de la V2: un `start-dev.bat` nativo de Windows usando `cmd /k` para lanzar ventanas de terminal independientes. Si el Backend crashea, su ventana sobrevive y expone el Stack Trace completo, manteniendo el entorno seguro para el desarrollador.

---

## [2026-07-04] OEE como módulo opcional + Manufacturing Models refactor

### Contexto
El campo `estimated_minutes` en `manufacturing_models` estaba hardcodeado como NOT NULL y siempre visible, aunque el cálculo de eficiencia/OEE es un módulo extra (`oee_monitoring`) que no todos los tenants necesitan.

### El Problema
1. `estimated_minutes` no tiene sentido sin un módulo de eficiencia activo.
2. El campo estaba siempre visible en el formulario, confundiendo usuarios que no necesitan OEE.
3. El tipo de medida era fijo (minutos), pero la producción puede medirse en piezas/h, m/h, kg/h, L/h.

### La Decisión
- **`estimated_minutes` eliminado.** Reemplazado por `unit_of_measure` (enum nullable) y `target_rate` (NUMERIC nullable).
- **Solo visible con OEE activo.** El frontend consulta `fetchCapabilities()` y solo renderiza los campos de unidad/meta si `oee_monitoring.enabled === true`.
- **Columnas condicionales.** La tabla de modelos oculta las columnas "Unidad" y "Meta" cuando OEE está desactivado.
- **DTO 100% opcional.** `unit_of_measure` y `target_rate` no son requeridos; se envían solo si el módulo está activo.

### Lección aprendida
Los campos que pertenecen a un módulo específico NUNCA deben ser visibles ni requeridos en el paquete base. La UI debe adaptarse dinámicamente a los módulos activos del tenant.
