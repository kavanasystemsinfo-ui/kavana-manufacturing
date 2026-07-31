# NotebookLM Context Index - Kavana Manufacturing

## Estado del documento

- **Última actualización:** 2026-07-04. Documentación actualizada con Fase 5.5.

## Cuaderno permanente

URL configurada por defecto en `tools-ai/notebooklm/notebook_bridge.py`:

```text
https://notebooklm.google.com/notebook/a8ef67a8-896b-463e-a522-eaae826b3b79
```

## Fuente principal sincronizada

El cuaderno debe mantener como base oficial todo el contenido de `docs/`, incluyendo:

- `docs/ai/`
- `docs/audit/`
- `docs/commercial/`
- `docs/technical/`
- `docs/01_architecture_v3.md`
- `docs/09_technical_debt.md`

Estos archivos cubren arquitectura, auditoría, comercial, HMI offline-first, multi-tenancy, modularidad, seguridad, roadmap, control de Roo Code y deuda técnica.

## Política crítica: evitar bucle de realimentación

Los outputs automáticos de NotebookLM **no deben sincronizarse de vuelta como fuentes permanentes**.

Ruta por defecto del script:

```text
docs/ai/outputs/
```

Ruta opcional para evitar bucles de Drive:

```text
tools-ai/notebooklm/outputs/
```

Regla:

1. Ejecutar el puente y guardar resultados en `docs/ai/outputs/`.
2. Revisar manualmente el Markdown antes de usarlo como fuente de verdad.
3. Si quieres evitar que Google Drive sincronice outputs automáticos, usa `KAVANA_NOTEBOOKLM_OUTPUT_DIR` o `--output-dir` apuntando a `tools-ai/notebooklm/outputs/`.
4. No añadir outputs automáticos como fuentes permanentes del cuaderno.

## Análisis de competencia

Para activar el Plan Estratégico de Análisis de Competencia dentro del mismo cuaderno permanente, añadir fuentes limpias y legibles en `docs/commercial/competitors/`:

- Manuales de usuario de Lantek.
- Manuales de usuario de Doeet.
- Manuales de usuario de MESbook.
- Manuales de usuario de Odoo Manufacturing.
- Volcados de reseñas negativas/neutras desde Capterra.
- Volcados de reseñas negativas/neutras desde G2.

Objetivo del cruce competitivo:

1. Fricción cero.
2. IA reactiva.
3. Persistencia ligera.

## Documentos de control de Roo Code

Mantener actualizados en la raíz de `docs/`:

- `docs/01_architecture_v3.md`: arquitectura compacta, feature flags JSONB, estructura de pestañas frontend e interceptores/contexto backend.
- `docs/09_technical_debt.md`: deuda técnica, brechas críticas y reglas que Roo Code no debe romper.

## Adiciones recomendadas

No es obligatorio crear un cuaderno independiente. Para mejorar la calidad de síntesis de NotebookLM, recomiendo sincronizar estos archivos maestros si tu carpeta de Drive lo permite:

1. `root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md`
2. `root/02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md`
3. `root/03_MASTER_MODULARIDAD_FeatureFlags_JSONB.md`
4. `root/04_MASTER_AUTENTICACION_Roles_y_Permisos.md`
5. `root/05_MASTER_CORE_Modelos_De_Datos_Produccion.md`
6. `root/06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md`
7. `root/07_MASTER_ADMIN_Gobernanza_JSONB_y_CustomFields.md`
8. `root/core-mes-production/001_production_orders.sql`
9. `database/migrations/000_extensions_roles_rls.sql`
10. `database/migrations/001_tenants_users.sql`
11. `database/migrations/002_workstations.sql`
12. `database/migrations/003_production_orders.sql`
13. `database/migrations/004_production_time_logs.sql`
14. `database/migrations/005_tenant_governance.sql`

## Prioridad de sincronización

### Prioridad alta

- `docs/01_architecture_v3.md`
- `docs/09_technical_debt.md`
- `docs/ai/00_orquestacion_arquitectura_ia.md`
- `docs/technical/00_architecture-overview.md`
- `docs/technical/01_multi-tenancy-rls-audit.md`
- `docs/technical/03_feature-flags-modularity.md`
- `docs/technical/05_frontend-hmi-offline-first.md`
- `root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md`
- `root/02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md`
- `database/migrations/005_tenant_governance.sql`

### Prioridad media

- `root/04_MASTER_AUTENTICACION_Roles_y_Permisos.md`
- `root/05_MASTER_CORE_Modelos_De_Datos_Produccion.md`
- `root/06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md`
- `root/07_MASTER_ADMIN_Gobernanza_JSONB_y_CustomFields.md`
- `database/migrations/000_extensions_roles_rls.sql` a `database/migrations/004_production_time_logs.sql`
- `docs/commercial/competitors/` cuando existan los archivos de competencia

### Prioridad baja

- `README.md`
- `ROADMAP.md`
- `KAVANA_RULES.md`
- `root/skills/README.md`

## No sincronizar en NotebookLM

No añadir al cuaderno:

- `.env`
- `backend/.env`
- `tools-ai/notebooklm/chrome_profile/`
- `tools-ai/notebooklm/outputs/`
- `node_modules/`
- `dist/`
- `build/`
- logs sensibles
- outputs automáticos de `docs/ai/outputs/` sin revisión humana
- PDFs o reseñas de competencia sin limpiar o con datos sensibles de terceros

## Nota operativa

Si NotebookLM empieza a saturarse por el límite de fuentes, priorizar:

1. `docs/01_architecture_v3.md`
2. `docs/09_technical_debt.md`
3. `docs/ai/00_orquestacion_arquitectura_ia.md`
4. `docs/technical/00_architecture-overview.md`
5. `docs/technical/01_multi-tenancy-rls-audit.md`
6. `docs/technical/03_feature-flags-modularity.md`
7. `docs/technical/05_frontend-hmi-offline-first.md`
8. `docs/audit/DECISIONES_ESTRATEGICAS.md`
9. `root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md`
10. `root/02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md`
