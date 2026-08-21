-- Migration 037: FORCE ROW LEVEL SECURITY en todas las tablas multi-tenant
--
-- FIX A1 (auditoría adversarial 2026-08-21): 9 tablas tenían ENABLE RLS
-- pero no FORCE. Con ENABLE solo, el propietario de la tabla (rol con el
-- que conecta producción) IGNORA las políticas: verificado empíricamente
-- leyendo filas cross-tenant como owner. FORCE obliga a que las políticas
-- apliquen también al owner; solo BYPASSRLS las esquiva.
--
-- OJO tipos de tenant_id (heredados del esquema): bigint en la mayoría,
-- INTEGER en quality_checks/cost_entries, UUID en ai_context_*.
-- Las políticas ya existentes de cada tabla usan el cast correcto; aquí
-- solo se fuerza RLS y se añade política kavana_app SOLO donde no existe
-- ninguna para ese rol (respetando el tipo de cada tabla).

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'cost_entries',
        'quality_checks',
        'incidencias',
        'incidencia_uploads',
        'manufacturing_models',
        'oee_metrics',
        'toolings',
        'ai_context_documents',
        'ai_context_chunks'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Política kavana_app solo para las tablas que NO tienen ninguna política
-- para ese rol (quality_checks/cost_entries/ai_context_* ya tienen la suya
-- con su cast de tipo correcto).
DO $$
DECLARE
    t TEXT;
    tenant_expr TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'incidencias', 'incidencia_uploads', 'manufacturing_models',
        'oee_metrics', 'toolings'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = t AND roles::text LIKE '%kavana_app%'
        ) THEN
            tenant_expr := 'tenant_id = get_current_tenant()';
            EXECUTE format(
                'CREATE POLICY rls_kavana_app_tenant_isolation ON %I FOR ALL TO kavana_app
                 USING (%s)
                 WITH CHECK (%s)', t, tenant_expr, tenant_expr);
        END IF;
    END LOOP;
END $$;
