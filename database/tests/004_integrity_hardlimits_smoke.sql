-- ============================================================================
-- KAVANA V3 - Smoke Test 004: integridad cross-tenant + hard_limits inmutable
-- Regression for migrations 035 (FK compuesta) and 036 (trigger hard_limits).
-- ============================================================================

BEGIN;

INSERT INTO tenants (id, name, status, feature_matrix)
VALUES
    (9101, 'Tenant A - integrity smoke', 'trial', '{}'::jsonb),
    (9102, 'Tenant B - integrity smoke', 'trial', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO workstations (tenant_id, id, code, name, status)
VALUES
    (9101, '00000000-0000-0000-0000-000000001011', 'WS-A', 'Linea A', 'active'),
    (9102, '00000000-0000-0000-0000-000000001012', 'WS-B', 'Linea B', 'active')
ON CONFLICT (tenant_id, id) DO NOTHING;

INSERT INTO orders (id, tenant_id, code, workstation_id, quantity, status, created_by)
VALUES
    ('00000000-0000-0000-0000-000000002001', 9101, 'OF-INT-A', '00000000-0000-0000-0000-000000001011', 10, 'pending', 'system'),
    ('00000000-0000-0000-0000-000000002002', 9102, 'OF-INT-B', '00000000-0000-0000-0000-000000001012', 10, 'pending', 'system')
ON CONFLICT (id) DO NOTHING;

-- 1. FK compuesta: insertar un work block del tenant A apuntando a la order
--    del tenant B debe fallar por la FK (tenant_id, order_id).
DO $$
BEGIN
    BEGIN
        INSERT INTO production_work_blocks
            (tenant_id, order_id, workstation_id, operator_id, type, start_time, end_time, produced_quantity)
        VALUES
            (9101, '00000000-0000-0000-0000-000000002002',
             '00000000-0000-0000-0000-000000001011',
             '00000000-0000-0000-0000-000000000021',
             'produccion', NOW() - INTERVAL '1 hour', NOW(), 5);
        RAISE EXCEPTION 'FK compuesta no bloqueo el INSERT cross-tenant';
    EXCEPTION
        WHEN foreign_key_violation THEN NULL; -- esperado
    END;
END $$;

-- 2. Trigger hard_limits: mutarlo como kavana_app debe fallar.
SET ROLE kavana_app;
DO $$
BEGIN
    BEGIN
        UPDATE tenants SET hard_limits = '{"max_users": 999999}'::jsonb WHERE id = 9101;
        RAISE EXCEPTION 'hard_limits fue mutable como kavana_app';
    EXCEPTION
        WHEN insufficient_privilege THEN NULL; -- esperado
    END;
END $$;
RESET ROLE;

ROLLBACK;
