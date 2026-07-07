# Skill: Kavana V3 - Backend, JWT, PgBouncer y RLS

## Propósito

Usa esta skill para diseñar, revisar o corregir backend NestJS/Node.js, autenticación, autorización, contexto de tenant, transacciones, PgBouncer y repositorios.

## Fuentes maestras

- [`02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md`](root/02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md)
- [`04_MASTER_AUTENTICACION_Roles_y_Permisos.md`](root/04_MASTER_AUTENTICACION_Roles_y_Permisos.md)

## Reglas críticas

1. **JWT y claims**
   - Validar firma con RS256/JWKS.
   - Extraer `tenant_id` de claims verificados.
   - No confiar en `tenant_id` recibido desde request body, query string o headers no firmados.
   - Soportar claims estándar y custom:
     - `tenant_id`
     - `custom:tenant_id`
   - Si falta tenant_id, denegar con 403.

2. **AsyncLocalStorage**
   - Usar `AsyncLocalStorage.run(context, callback)`.
   - Prohibido `enterWith()`.
   - El contexto debe incluir al menos:
     ```ts
     interface TenantContext {
       tenantId: bigint;
       userId: string;
       role: string;
     }
     ```
   - Si no existe contexto, bloquear ejecución segura.

3. **PgBouncer Transaction Pooling**
   - Usar `SET LOCAL app.current_tenant_id = $1` dentro de transacción activa.
   - Prohibido `SET SESSION`.
   - Iniciar transacción antes de inyectar el GUC.
   - Hacer rollback en errores y liberar conexión en `finally`.

4. **RBAC**
   - Roles soportados:
     - `super_admin`
     - `tenant_admin`
     - `supervisor`
     - `operario`
   - Usar guards/decoradores para endpoints protegidos.
   - No revelar si un recurso pertenece a otro tenant.
   - Ante acceso transversal, devolver 404 o vacío, no error de permisos que permita enumeración.

5. **Repositorios y consultas**
   - Incluir `tenant_id` en todos los filtros.
   - Usar claves compuestas en FK.
   - No hacer consultas globales sin tenant salvo operaciones explícitas de plataforma/SaaS fuera de RLS.

6. **Auditoría y emergencia**
   - Respetar `maintenance_bypass_roles` solo desde JSONB de operaciones y con auditoría.
   - No implementar bypasses silenciosos.

## Checklist de revisión backend

- [ ] JWT validado con algoritmo seguro.
- [ ] Tenant extraído desde token verificado.
- [ ] Contexto encapsulado con `AsyncLocalStorage.run()`.
- [ ] No hay `enterWith()`.
- [ ] Transacción iniciada antes de `SET LOCAL`.
- [ ] No hay `SET SESSION`.
- [ ] Repositorios filtran por `tenant_id`.
- [ ] Guards de roles implementados.
- [ ] Errores de acceso transversal no enumeran datos.
- [ ] Liberación de conexión en `finally`.
- [ ] **Documentation Loop:** Cada cambio de código tiene documentación asociada.

## Documentation Loop (OBLIGATORIO)

**Regla:** Un cambio sin documentación es un cambio incompleto.

Después de cada cambio de código que pase tests, actualizar documentación:
1. `docs/roadmap.md` — Estado de fase y conteo de tests.
2. `docs/decisions-log.md` — Si hubo decisión técnica.
3. `docs/technical/XX_<doc-afectado>.md` — Documento técnico afectado.
4. `docs/audit/changelog.md` — Si es funcionalidad nueva.
5. `docs/commercial/*.md` — Si afecta valor de negocio.

## Resultado esperado

Backend seguro, hermético bajo concurrencia, compatible con PgBouncer Transaction Pooling y alineado con RLS Fail-Closed.
