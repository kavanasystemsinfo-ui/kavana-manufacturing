-- ============================================================================
-- KAVANA V3 - RLS Isolation Smoke Test
-- Purpose: Manual regression test proving fail-closed tenant isolation.
-- Run only after migrations 000..004 are applied.
-- Expected result: the second SELECT returns 0 rows for tenant 9001.
-- ============================================================================

BEGIN;

INSERT INTO tenants (id, name, status, feature_matrix)
VALUES
    (9001, 'Tenant A - isolation smoke', 'trial', '{}'::jsonb),
    (9002, 'Tenant B - isolation smoke', 'trial', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status,
    feature_matrix = EXCLUDED.feature_matrix,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO users (tenant_id, id, email, name, role)
VALUES
    (9001, '00000000-0000-0000-0000-000000000021', 'op.a@kavana.local', 'Operario A', 'operario'),
    (9002, '00000000-0000-0000-0000-000000000022', 'op.b@kavana.local', 'Operario B', 'operario')
ON CONFLICT (tenant_id, id) DO UPDATE
SET email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO workstations (tenant_id, id, code, name, status)
VALUES
    (9001, '00000000-0000-0000-0000-000000000011', 'LINEA-01', 'Línea 01', 'active'),
    (9002, '00000000-0000-0000-0000-000000000012', 'LINEA-02', 'Línea 02', 'active')
ON CONFLICT (tenant_id, id) DO UPDATE
SET code = EXCLUDED.code,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO production_orders (tenant_id, id, code, target_quantity, workstation_id, status)
VALUES
    (9001, '00000000-0000-0000-0000-000000000001', 'OF-RLS-A', 100, '00000000-0000-0000-0000-000000000011', 'pendiente'),
    (9002, '00000000-0000-0000-0000-000000000002', 'OF-RLS-B', 100, '00000000-0000-0000-0000-000000000012', 'pendiente')
ON CONFLICT (tenant_id, id) DO UPDATE
SET code = EXCLUDED.code,
    target_quantity = EXCLUDED.target_quantity,
    workstation_id = EXCLUDED.workstation_id,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

SET LOCAL app.current_tenant_id = '9001';
SET ROLE kavana_app;

SELECT COUNT(*) AS visible_orders_for_tenant_9001
FROM production_orders;

SET LOCAL app.current_tenant_id = '9002';

SELECT COUNT(*) AS leaked_orders_from_tenant_9001
FROM production_orders
WHERE tenant_id = 9001;

RESET ROLE;
ROLLBACK;
