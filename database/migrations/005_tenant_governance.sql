-- ============================================================================
-- KAVANA V3 - Database Migration 005
-- Purpose: Tenant governance, feature_matrix normalization, hard limits and audit trail.
-- ============================================================================

CREATE OR REPLACE FUNCTION default_tenant_feature_matrix()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT jsonb_build_object(
        'schema_version', '3.1.0',
        'tenant_context', jsonb_build_object(
            'tier', 'trial',
            'region', 'eu-west-1',
            'is_trial', true,
            'trial_ends_at', NULL
        ),
        'resource_quotas', jsonb_build_object(
            'storage', jsonb_build_object(
                'limit_gb', 10,
                'soft_limit_percent', 80,
                'overage_allowed', false
            ),
            'compute', jsonb_build_object(
                'max_users', 10,
                'max_parallel_jobs', 1,
                'retention_days', 90
            ),
            'entities', jsonb_build_object(
                'max_records_per_module', 10000,
                'max_custom_fields', 5
            )
        ),
        'modular_matrix', jsonb_build_object(
            'core_mes', jsonb_build_object(
                'enabled', true,
                'features', jsonb_build_object(
                    'hmi_offline_first', true
                )
            ),
            'oee_monitoring', jsonb_build_object(
                'enabled', false,
                'features', jsonb_build_object(
                    'real_time_dashboard', false,
                    'predictive_maintenance', false,
                    'historical_analytics', 'none'
                )
            ),
            'quality_assurance', jsonb_build_object(
                'enabled', false,
                'features', jsonb_build_object(
                    'iso_compliance_pack', false,
                    'automated_sampling', false
                )
            ),
            'cost_management', jsonb_build_object(
                'enabled', false,
                'features', jsonb_build_object(
                    'multi_currency', false,
                    'erp_integration', 'none',
                    'margin_analysis', false
                )
            )
        ),
        'ops_flags', jsonb_build_object(
            'circuit_breaker_enabled', true,
            'debug_mode', false,
            'maintenance_bypass_roles', jsonb_build_array('super_admin')
        )
    );
$$;

CREATE OR REPLACE FUNCTION default_tenant_hard_limits()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT jsonb_build_object(
        'storage', jsonb_build_object(
            'limit_gb', 500,
            'overage_allowed', false
        ),
        'compute', jsonb_build_object(
            'max_users', 500,
            'max_parallel_jobs', 25
        ),
        'entities', jsonb_build_object(
            'max_custom_fields', 50,
            'max_records_per_module', 1000000
        ),
        'modules', jsonb_build_object(
            'max_enabled_premium_modules', 3
        )
    );
$$;

CREATE OR REPLACE FUNCTION normalize_tenant_feature_matrix(input JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    base_matrix JSONB := default_tenant_feature_matrix();
    incoming JSONB := COALESCE(NULLIF(input, '{}'::jsonb), '{}'::jsonb);
    result JSONB;
BEGIN
    result := base_matrix || incoming;

    IF jsonb_typeof(incoming -> 'tenant_context') = 'object' THEN
        result := jsonb_set(result, '{tenant_context}', (base_matrix -> 'tenant_context') || (incoming -> 'tenant_context'), true);
    END IF;

    IF jsonb_typeof(incoming -> 'resource_quotas') = 'object' THEN
        result := jsonb_set(result, '{resource_quotas}', (base_matrix -> 'resource_quotas') || (incoming -> 'resource_quotas'), true);
    END IF;

    IF jsonb_typeof(incoming -> 'modular_matrix') = 'object' THEN
        result := jsonb_set(result, '{modular_matrix}', (base_matrix -> 'modular_matrix') || (incoming -> 'modular_matrix'), true);
    END IF;

    IF jsonb_typeof(incoming -> 'ops_flags') = 'object' THEN
        result := jsonb_set(result, '{ops_flags}', (base_matrix -> 'ops_flags') || (incoming -> 'ops_flags'), true);
    END IF;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION normalize_tenant_hard_limits(input JSONB)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(default_tenant_hard_limits(), '{}'::jsonb)
           || COALESCE(NULLIF(input, '{}'::jsonb), '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION normalize_tenant_custom_fields_schema(input JSONB)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN input IS NULL OR jsonb_typeof(input) <> 'object' THEN '{}'::jsonb
        ELSE input
    END;
$$;

CREATE OR REPLACE FUNCTION normalize_tenant_row()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.feature_matrix := normalize_tenant_feature_matrix(NEW.feature_matrix);
    NEW.custom_fields_schema := normalize_tenant_custom_fields_schema(NEW.custom_fields_schema);
    NEW.hard_limits := normalize_tenant_hard_limits(NEW.hard_limits);

    IF TG_OP = 'UPDATE'
       AND (
            OLD.feature_matrix IS DISTINCT FROM NEW.feature_matrix
         OR OLD.custom_fields_schema IS DISTINCT FROM NEW.custom_fields_schema
         OR OLD.hard_limits IS DISTINCT FROM NEW.hard_limits
       ) THEN
        NEW.governance_version := COALESCE(OLD.governance_version, 0) + 1;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION tenant_feature_enabled(p_tenant_id BIGINT, p_module_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        (feature_matrix -> 'modular_matrix' -> p_module_key ->> 'enabled')::BOOLEAN,
        false
    )
    FROM tenants
    WHERE id = p_tenant_id;
$$;

COMMENT ON FUNCTION tenant_feature_enabled(BIGINT, TEXT) IS
    'Fail-safe helper for backend feature guards. Unknown modules return false.';

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS custom_fields_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS hard_limits JSONB NOT NULL DEFAULT default_tenant_hard_limits(),
    ADD COLUMN IF NOT EXISTS governance_version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tenants_hard_limits_path
    ON tenants USING GIN (hard_limits jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_tenants_governance_version
    ON tenants (governance_version);

DROP TRIGGER IF EXISTS trg_tenants_normalize_governance ON tenants;

CREATE TRIGGER trg_tenants_normalize_governance
    BEFORE INSERT OR UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION normalize_tenant_row();

UPDATE tenants
SET feature_matrix = normalize_tenant_feature_matrix(feature_matrix),
    custom_fields_schema = normalize_tenant_custom_fields_schema(custom_fields_schema),
    hard_limits = normalize_tenant_hard_limits(hard_limits),
    governance_version = 0
WHERE feature_matrix = '{}'::jsonb
   OR custom_fields_schema = '{}'::jsonb
   OR hard_limits = '{}'::jsonb
   OR NOT (feature_matrix ? 'schema_version');

CREATE TABLE IF NOT EXISTS tenant_config_audit (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    actor_user_id UUID,
    action TEXT NOT NULL CHECK (action IN ('feature_matrix', 'custom_fields_schema', 'hard_limits')),
    previous_value JSONB NOT NULL,
    new_value JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_tenant_config_audit_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_config_audit_tenant_created_at
    ON tenant_config_audit (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_config_audit_tenant_action
    ON tenant_config_audit (tenant_id, action);

CREATE OR REPLACE FUNCTION audit_tenant_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.feature_matrix IS DISTINCT FROM NEW.feature_matrix THEN
        INSERT INTO tenant_config_audit (
            tenant_id,
            actor_user_id,
            action,
            previous_value,
            new_value,
            metadata
        )
        VALUES (
            NEW.id,
            NULL,
            'feature_matrix',
            OLD.feature_matrix,
            NEW.feature_matrix,
            jsonb_build_object('reason', 'tenant configuration change')
        );
    END IF;

    IF OLD.custom_fields_schema IS DISTINCT FROM NEW.custom_fields_schema THEN
        INSERT INTO tenant_config_audit (
            tenant_id,
            actor_user_id,
            action,
            previous_value,
            new_value,
            metadata
        )
        VALUES (
            NEW.id,
            NULL,
            'custom_fields_schema',
            OLD.custom_fields_schema,
            NEW.custom_fields_schema,
            jsonb_build_object('reason', 'tenant configuration change')
        );
    END IF;

    IF OLD.hard_limits IS DISTINCT FROM NEW.hard_limits THEN
        INSERT INTO tenant_config_audit (
            tenant_id,
            actor_user_id,
            action,
            previous_value,
            new_value,
            metadata
        )
        VALUES (
            NEW.id,
            NULL,
            'hard_limits',
            OLD.hard_limits,
            NEW.hard_limits,
            jsonb_build_object('reason', 'tenant configuration change')
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_config_audit_changes ON tenants;

CREATE TRIGGER trg_tenant_config_audit_changes
    AFTER UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION audit_tenant_config_change();

ALTER TABLE tenant_config_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_config_audit FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_config_audit_tenant_isolation ON tenant_config_audit;

CREATE POLICY rls_tenant_config_audit_tenant_isolation
    ON tenant_config_audit
    FOR ALL
    TO kavana_app
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

COMMENT ON COLUMN tenants.custom_fields_schema IS
    'Tenant-defined dynamic field schema for runtime validation. Tenant Admin may edit this value.';

COMMENT ON COLUMN tenants.hard_limits IS
    'Non-editable infrastructure and commercial limits. Tenant Admin must not modify this value.';

COMMENT ON COLUMN tenants.governance_version IS
    'Monotonic cache invalidation counter for feature_matrix, custom_fields_schema and hard_limits.';

COMMENT ON TABLE tenant_config_audit IS
    'Audit trail for critical tenant configuration changes: modules, quotas, schemas and hard limits.';
