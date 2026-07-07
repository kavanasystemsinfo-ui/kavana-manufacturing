-- ============================================================================
-- KAVANA V3 - Database Migration 003
-- Purpose: Tenant-isolated production orders.
-- Replaces partial scaffold: root/core-mes-production/001_production_orders.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_orders (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    code VARCHAR(100) NOT NULL,

    target_quantity NUMERIC(12, 4) NOT NULL CHECK (target_quantity > 0),
    produced_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (produced_quantity >= 0),
    defect_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (defect_quantity >= 0),

    status TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (status IN ('pendiente', 'en_marcha', 'pausado', 'terminado')),

    workstation_id UUID,

    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_production_orders_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_production_orders_workstation_same_tenant
        FOREIGN KEY (tenant_id, workstation_id)
        REFERENCES workstations(tenant_id, id)
        ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_production_orders_tenant_code
    ON production_orders (tenant_id, UPPER(code));

CREATE INDEX IF NOT EXISTS idx_production_orders_tenant_status
    ON production_orders (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_production_orders_tenant_workstation
    ON production_orders (tenant_id, workstation_id);

CREATE TRIGGER trg_production_orders_set_updated_at
    BEFORE UPDATE ON production_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_production_orders_tenant_isolation ON production_orders;

CREATE POLICY rls_production_orders_tenant_isolation
    ON production_orders
    FOR ALL
    TO kavana_app
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());
