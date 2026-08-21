-- ============================================================================
-- KAVANA V3 - RLS Isolation Smoke Test: raw_materials + bom_items
-- Regression for migration 034. Proves fail-closed tenant isolation on the
-- materials/BOM tables, which shipped without RLS in migration 028.
-- Expected result: the leak SELECTs return 0 rows for tenant 9001.
-- ============================================================================

BEGIN;

INSERT INTO tenants (id, name, status, feature_matrix)
VALUES
    (9001, 'Tenant A - materials smoke', 'trial', '{}'::jsonb),
    (9002, 'Tenant B - materials smoke', 'trial', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;

INSERT INTO raw_materials (tenant_id, id, code, name, unit, unit_cost)
VALUES
    (9001, '00000000-0000-0000-0000-0000000000a1', 'MAT-A', 'Vidrio 3.2mm', 'm2', 5.50),
    (9002, '00000000-0000-0000-0000-0000000000b1', 'MAT-B', 'Celula mono', 'uds', 0.80)
ON CONFLICT (tenant_id, id) DO NOTHING;

INSERT INTO bom_items (tenant_id, id, model_id, material_id, quantity)
VALUES
    (9001, '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 2.0),
    (9002, '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 1.0)
ON CONFLICT (tenant_id, id) DO NOTHING;

SET LOCAL app.current_tenant_id = '9001';
SET ROLE kavana_app;

-- Tenant 9001 solo ve su material
SELECT COUNT(*) AS visible_materials_for_9001 FROM raw_materials;

-- Fuga: filas del tenant 9002 NO deben ser visibles
SELECT COUNT(*) AS leaked_materials_from_9002
FROM raw_materials WHERE tenant_id = 9002;

SELECT COUNT(*) AS leaked_bom_from_9002
FROM bom_items WHERE tenant_id = 9002;

-- Cross-tenant INSERT debe fallar por WITH CHECK
DO $$
BEGIN
    BEGIN
        INSERT INTO raw_materials (tenant_id, code, name, unit)
        VALUES (9002, 'MAT-EVIL', 'Fuga', 'uds');
        RAISE EXCEPTION 'RLS WITH CHECK failed: cross-tenant INSERT was accepted';
    EXCEPTION
        WHEN insufficient_privilege THEN NULL; -- esperado: RLS lo bloquea
    END;
END $$;

RESET ROLE;
ROLLBACK;
