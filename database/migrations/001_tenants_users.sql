-- ============================================================================
-- KAVANA V3 - Database Migration 001
-- Purpose: Tenant master table, local users and fail-closed RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'trial')),
    feature_matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_feature_matrix_path
    ON tenants USING GIN (feature_matrix jsonb_path_ops);

CREATE TRIGGER trg_tenants_set_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS users (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'supervisor', 'operario')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_users_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email
    ON users (tenant_id, LOWER(email));

CREATE INDEX IF NOT EXISTS idx_users_tenant_role
    ON users (tenant_id, role);

CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_users_tenant_isolation ON users;

CREATE POLICY rls_users_tenant_isolation
    ON users
    FOR ALL
    TO kavana_app
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());
