-- ============================================================================
-- KAVANA V3 - Database Migration 002
-- Purpose: Tenant-isolated workstations / machines / plant cells.
-- ============================================================================

CREATE TABLE IF NOT EXISTS workstations (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_workstations_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workstations_tenant_code
    ON workstations (tenant_id, UPPER(code));

CREATE INDEX IF NOT EXISTS idx_workstations_tenant_status
    ON workstations (tenant_id, status);

CREATE TRIGGER trg_workstations_set_updated_at
    BEFORE UPDATE ON workstations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

ALTER TABLE workstations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_workstations_tenant_isolation ON workstations;

CREATE POLICY rls_workstations_tenant_isolation
    ON workstations
    FOR ALL
    TO kavana_app
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());
