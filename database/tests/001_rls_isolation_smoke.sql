-- ============================================================================
-- KAVANA V3 - RLS Isolation Smoke Test
-- Purpose: Manual regression test proving fail-closed tenant isolation.
-- Run after migrations 000..033 (estado final: tabla orders, users con
-- username en vez de email, production_orders ya no existe).
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

INSERT INTO users (tenant_id, id, username, password_hash, first_name, last_name, role)
VALUES
    (9001, '00000000-0000-0000-0000-000000000021', 'op.a@kavana.local', '!smoke', 'Operario', 'A', 'operario'),
    (9002, '00000000-0000-0000-0000-000000000022', 'op.b@kavana.local', '!smoke', 'Operario', 'B', 'operario')
ON CONFLICT (tenant_id, id) DO UPDATE
SET username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
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

INSERT INTO orders (id, tenant_id, code, model_id, workstation_id, quantity, status, created_by)
VALUES
    ('00000000-0000-0000-0000-000000000001', 9001, 'OF-RLS-A', NULL, '00000000-0000-0000-0000-000000000011', 100, 'pending', 'system'),
    ('00000000-0000-0000-0000-000000000002', 9002, 'OF-RLS-B', NULL, '00000000-0000-0000-0000-000000000012', 100, 'pending', 'system')
ON CONFLICT (id) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    code = EXCLUDED.code,
    workstation_id = EXCLUDED.workstation_id,
    quantity = EXCLUDED.quantity,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

SET LOCAL app.current_tenant_id = '9001';
SET ROLE kavana_app;

SELECT COUNT(*) AS visible_orders_for_tenant_9001
FROM orders;

SET LOCAL app.current_tenant_id = '9002';

SELECT COUNT(*) AS leaked_orders_from_tenant_9001
FROM orders
WHERE tenant_id = 9001;

RESET ROLE;
ROLLBACK;
