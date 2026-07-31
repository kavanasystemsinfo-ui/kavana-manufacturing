# Skill: Kavana Manufacturing - Modularidad y Feature Flags JSONB

## Propósito

Usa esta skill para diseñar módulos nuevos, activación por tenant, feature flags, límites de recursos, caché de feature_matrix y decisión UI/backend basada en capacidades. Incluye soporte para sistema de temas dual (Clásico ERP + Moderno Kavana).

## Fuente maestra

- [`03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md`](root/03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md)

## Dual Theme - Convenciones

Para nuevos componentes UI:
1. Crear variante moderna en `NombrePanel.tsx`
2. Crear variante clásica en `ClassicNombrePanel.tsx`
3. Ambas variantes usan el mismo Zustand store
4. Routing en `App.tsx` selecciona variante según `localStorage.getItem('kavana_theme')`

**Estilo Clásico ERP:**
- Tablas HTML estándar (`<table>`, `<thead>`, `<tbody>`)
- Fondos claros (`bg-slate-50`, `bg-white`)
- Bordes sutiles (`border-slate-200`)
- Badges de estado con colores semánticos
- Botones estándar (`bg-blue-600 text-white`)

**Estilo Moderno Kavana:**
- Tarjetas con bordes redondeados (`rounded-2xl`)
- Fondos oscuros (`bg-kavana-dark`, `bg-kavana-panel`)
- Gradientres sutiles (`bg-gradient-to-br`)
- Toggle switches para estados
- Acentos naranja (`bg-kavana-orange`)

## Estructura de `feature_matrix`

La matriz debe seguir una estructura versionada:

```json
{
  "schema_version": "3.1.0",
  "tenant_context": {
    "tier": "enterprise_gold",
    "region": "eu-west-1",
    "is_trial": false,
    "trial_ends_at": "2026-12-31T23:59:59Z"
  },
  "resource_quotas": {
    "storage": {
      "limit_gb": 500,
      "soft_limit_percent": 90,
      "overage_allowed": false
    },
    "compute": {
      "max_users": 150,
      "max_parallel_jobs": 25,
      "retention_days": 730
    },
    "entities": {
      "max_records_per_module": 1000000,
      "max_custom_fields": 50
    }
  },
  "modular_matrix": {
    "oee_monitoring": {
      "enabled": true,
      "features": {
        "real_time_dashboard": true,
        "predictive_maintenance": false,
        "historical_analytics": "advanced"
      }
    },
    "cost_management": {
      "enabled": true,
      "features": {
        "multi_currency": true,
        "erp_integration": "sap_v2",
        "margin_analysis": true
      }
    },
    "quality_assurance": {
      "enabled": false,
      "features": {
        "iso_compliance_pack": false,
        "automated_sampling": false
      }
    }
  },
  "ops_flags": {
    "circuit_breaker_enabled": true,
    "debug_mode": false,
    "maintenance_bypass_roles": ["super_admin"]
  }
}
```

## Reglas críticas

1. **Módulos nuevos**
   - Cada módulo nuevo debe vivir en una carpeta independiente.
   - Cada módulo debe declararse bajo `feature_matrix.modular_matrix`.
   - Ejemplo:
     ```json
     "quality_assurance": {
       "enabled": true,
       "features": {
         "automated_sampling": true
       }
     }
     ```

2. **Backend gatekeeping**
   - Usar decorador `@RequireFeature('module_key')`.
   - Usar guard que valida `feature_matrix.modular_matrix[module].enabled === true`.
   - Validar antes de ejecutar controladores, servicios o queries pesadas.
   - Si el módulo no está activo, devolver 403 con mensaje controlado.

3. **Caché**
   - Usar L1 local con TTL corto.
   - Usar L2 Redis con TTL largo.
   - Fallback seguro a PostgreSQL.
   - Implementar SingleFlight para evitar cache stampede.
   - Invalidar caché al cambiar `feature_matrix`.

4. **JSONB y rendimiento**
   - Mantener `feature_matrix` pequeño para evitar penalización TOAST.
   - Usar GIN `jsonb_path_ops` para contención:
     ```sql
     CREATE INDEX idx_feature_matrix_path
     ON tenants USING GIN (feature_matrix jsonb_path_ops);
     ```
   - Usar índices funcionales para rangos:
     ```sql
     CREATE INDEX idx_max_users
     ON tenants (((feature_matrix->'resource_quotas'->'compute'->>'max_users')::int));
     ```

5. **Frontend**
   - Evitar UI flashing.
   - Bootstrapear capacidades al arranque.
   - Persistir capacidades en localStorage como resiliencia visual.
   - Los componentes no deben preguntar flags directamente; deben recibir capacidades evaluadas.

## Checklist de revisión

- [ ] Módulo en carpeta independiente.
- [ ] Módulo declarado en `feature_matrix`.
- [ ] Backend valida con `@RequireFeature`/guard.
- [ ] Frontend recibe capacidades evaluadas.
- [ ] Caché L1/L2 implementada si aplica.
- [ ] Invalidación de caché prevista.
- [ ] Índices JSONB adecuados.
- [ ] Límites de cuotas validados.
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

Módulos Kavana Manufacturing activables por tenant, seguros, cacheables y sin UI parpadeante.
