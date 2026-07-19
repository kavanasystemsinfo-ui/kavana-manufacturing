# ADR-001: Multi-tenancy con Shared Schema y Row-Level Security (RLS)

**Status:** Aceptada  
**Fecha:** 2025-08  
**Decisor:** Jorge Luis Parra (Consultor IT / Arquitecto)  
**Contexto:** Primera fase de Kavana Manufacturing — migración de estructura monolítica a SaaS multi-tenant  
**Última actualización:** 2026-07-04

---

## Contexto

Kavana V2 operaba con base de datos compartida sin aislamiento real entre clientes. Un bug en la lógica de un tenant podía afectar datos de otros. La arquitectura multi-tenancy con schema separado (por cliente) era factible pero introducía complejidad exponencial en migraciones y mantenimiento.

**Presión regulatoria:** Industria farmacéutica exige trazabilidad de datos por lote (FDA 21 CFR Part 11). Un leak de datos entre clientes podría causar:
- Pérdida de certificaciones GMP
- Multas regulatorias
- Daño reputacional irreversible

## Opciones Evaluadas

| Opción | Complejidad | Aislamiento | Mantenimiento | Costo |
|--------|-------------|-------------|---------------|-------|
| **DB separada por tenant** | Alta | Máximo | Migraciones N veces | $$ |
| **Schema por tenant** | Media | Alto | Migraciones N veces | $ |
| **Shared schema + RLS** | Media | Alto | Migración única | $ |
| **Shared schema + app logic** | Baja | Bajo | Migración única | $ |

## Decisión

**Shared Schema + Row-Level Security (RLS) en PostgreSQL 16**

### Justificación Técnica

1. **RLS es enforcement a nivel de base de datos**, no de aplicación
   - Incluso un bug en el backend no puede exponer datos cross-tenant
   - PostgreSQL evalúa políticas antes de cada consulta (SELECT, INSERT, UPDATE, DELETE)
   - Funciona incluso si alguien tiene acceso directo a la DB

2. **Migraciones únicas** — una sola migración afecta a todos los tenants
   - Sin riesgo de olvidar un schema en un tenant
   - Rollbacks simples y consistentes

3. **Performance** — PostgreSQL 16 optimiza RLS con índices parciales
   - `WHERE tenant_id = current_setting('app.current_tenant')::uuid` permite índices eficientes
   - Sin overhead de JOINs cross-schema

4. **Escalabilidad** — el schema shared soporta miles de tenants
   - Un solo cluster PostgreSQL puede manejar 10,000+ tenants
   - Connection pooling eficiente (pgbouncer con RLS)

### Implementación

```sql
-- Política RLS base
CREATE POLICY tenant_isolation ON core_orders
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- En cada operación del backend
SET LOCAL app.current_tenant = 'uuid-del-tenant';
```

```typescript
// NestJS middleware
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    // Set tenant context in DB session
    req.dbSession = `SET LOCAL app.current_tenant = '${tenantId}'`;
    next();
  }
}
```

## Consecuencias

### Positivas
- Aislamiento real a nivel de DB (no depende de bugs de aplicación)
- Migraciones únicas y consistentes
- Menor overhead operativo que schema-per-tenant

### Negativas
- Los índices deben incluir `tenant_id` para performance
- Los reports cross-tenant requieren superuser role (bypass RLS)
- Debugging requiere entender el contexto de tenant en cada query

### Riesgos Mitigados
- **Leak de datos:** RLS previene por diseño
- **Performance:** Índices parciales en tenant_id compensan
- **Mantenimiento:** Migraciones únicas reducen carga operativa

---

**Próximos pasos:**
- ADR-002: Feature Flags para Modularidad
- ADR-003: Offline-First con FIFO Sync
- ADR-004: UX Tunnel Vision para HMI
