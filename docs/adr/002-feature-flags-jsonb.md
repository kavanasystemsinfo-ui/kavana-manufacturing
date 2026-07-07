# ADR-002: Feature Flags como JSONB en tenant_features

**Status:** Aceptada  
**Fecha:** 2025-08  
**Decisor:** Jorge Luis Parra  
**Contexto:** Fase de modularidad — clientes pagan por funcionalidades específicas (OEE, MES, Dashboard)

---

## Contexto

Kavana V3 es un **SaaS de pago por uso**. Cada cliente tiene licencia para módulos específicos:
- **Módulo Operador** (HMI): Obligatorio para todos
- **Módulo MES**: Planificación, reports, OEE avanzado
- **Módulo Dashboard**: Analytics e indicadores

**Problema:** Sin un mecanismo dinámico de feature flags:
- Cada cliente necesita deploy separado → alto costo operativo
- No se puede deshabilitar funcionalidad por cliente (deuda técnica)
- Los permisos por rol están mezclados con licencias por cliente

## Opciones Evaluadas

| Opción | Runtime | Flexibilidad | Persistencia | Complejidad |
|--------|---------|--------------|--------------|-------------|
| **JSONB en DB** | PostgreSQL | Alta | Automática | Baja |
| **Redis/Memcached** | App | Alta | Requiere sync | Media |
| **Env vars** | Deploy | Baja | Manual | Muy baja |
| **Config server (Consul)** | External | Alta | Alta | Alta |

## Decisión

**JSONB en tabla `tenant_features` + Feature Guard en NestJS**

### Diseño

```sql
CREATE TABLE tenant_features (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  features JSONB NOT NULL DEFAULT '{
    "operator": true,
    "mes": false,
    "dashboard": false,
    "reports": false
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas rápidas
CREATE INDEX idx_tenant_features ON tenant_features USING GIN (features);
```

### Implementación en Backend

```typescript
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    const requiredFeature = this.getRequiredFeature(context);

    const tenant = await this.prisma.tenant_features.findUnique({
      where: { tenant_id: tenantId },
      select: { features: true }
    });

    if (!tenant?.features?.[requiredFeature]) {
      throw new ForbiddenException(
        `Feature '${requiredFeature}' no habilitada para este tenant`
      );
    }

    return true;
  }
}
```

### Uso en Controladores

```typescript
@UseGuards(FeatureGuard)
@Feature('mes')
@Get('production-orders')
async getProductionOrders() {
  return this.service.getOrders();
}
```

## Justificación

1. **Persistencia automática** — Los flags viven en la DB, no en memoria
2. **Hot reload** — Un DBA puede habilitar/deshabilitar sin restart
3. **Auditoría** — `updated_at` registra cuándo cambió el flag
4. **Performance** — PostgreSQL GIN index hace `features->>'mes'` O(log n)
5. **Testing** — Fácil mockear en tests unitarios

## Consecuencias

### Positivas
- Activación/desactivación instantánea sin deploy
- Facturación simplificada (flags = licencias)
- Testing granular por feature
- UI se adapta dinámicamente a módulos activos (ej: OEE oculta campos de eficiencia)

### Negativas
- Requiere migración para agregar features nuevas
- Los features defaults deben mantenerse sincronizados con el código
- Si un tenant tiene feature=true pero el código no la implementa → comportamiento indefinido

### Riesgos Mitigados
- **Sync código-features:** Validación en startup que features conocidas están en el código
- **Performance:** GIN index compensa consultas frecuentes
- **Defaults:** Migración incluye defaults para nuevos tenants
- **UI condicional:** Frontend consulta `fetchCapabilities()` y renderiza condicionalmente según módulos activos

---

**Relación con ADR-001:** Feature flags dependen de RLS para aislamiento de tenant.
