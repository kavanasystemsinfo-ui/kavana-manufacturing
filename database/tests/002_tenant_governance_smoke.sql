-- ============================================================================
-- KAVANA V3 - Tenant Governance Smoke Test
-- Purpose: Manual regression test for migrations 000..005.
-- Run only after database/migrations/005_tenant_governance.sql has been applied.
-- ============================================================================

BEGIN;

INSERT INTO tenants (id, name, status, feature_matrix)
VALUES (9101, 'Tenant A - governance smoke', 'trial', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status,
    feature_matrix = EXCLUDED.feature_matrix,
    updated_at = CURRENT_TIMESTAMP;

DO $$
DECLARE
    v_feature_matrix JSONB;
    v_hard_limits JSONB;
    v_custom_fields_schema JSONB;
    v_governance_version BIGINT;
    v_audit_count BIGINT;
BEGIN
    SELECT feature_matrix, hard_limits, custom_fields_schema, governance_version
    INTO v_feature_matrix, v_hard_limits, v_custom_fields_schema, v_governance_version
    FROM tenants
    WHERE id = 9101;

    IF v_feature_matrix ->> 'schema_version' IS DISTINCT FROM '3.1.0' THEN
        RAISE EXCEPTION 'feature_matrix was not normalized with schema_version 3.1.0';
    END IF;

    IF NOT tenant_feature_enabled(9101, 'core_mes') THEN
        RAISE EXCEPTION 'core_mes must be enabled by default';
    END IF;

    IF tenant_feature_enabled(9101, 'oee_monitoring') THEN
        RAISE EXCEPTION 'oee_monitoring must be disabled by default';
    END IF;

    IF v_hard_limits -> 'entities' ->> 'max_custom_fields' IS NULL THEN
        RAISE EXCEPTION 'hard_limits must include max_custom_fields';
    END IF;

    IF jsonb_typeof(v_custom_fields_schema) <> 'object' THEN
        RAISE EXCEPTION 'custom_fields_schema must be a JSON object';
    END IF;

    UPDATE tenants
    SET feature_matrix = jsonb_build_object(
            'modular_matrix', jsonb_build_object(
                'oee_monitoring', jsonb_build_object('enabled', true)
            )
        )
    WHERE id = 9101;

    IF NOT tenant_feature_enabled(9101, 'core_mes') THEN
        RAISE EXCEPTION 'partial feature_matrix update must preserve core_mes';
    END IF;

    IF NOT tenant_feature_enabled(9101, 'oee_monitoring') THEN
        RAISE EXCEPTION 'partial feature_matrix update must enable oee_monitoring';
    END IF;

    UPDATE tenants
    SET custom_fields_schema = jsonb_build_object(
            'production_orders', jsonb_build_object(
                'fields', jsonb_build_array(
                    jsonb_build_object(
                        'key', 'lote',
                        'label', 'Lote',
                        'type', 'string',
                        'required', true
                    )
                )
            )
        )
    WHERE id = 9101;

    SELECT governance_version
    INTO v_governance_version
    FROM tenants
    WHERE id = 9101;

    IF v_governance_version < 2 THEN
        RAISE EXCEPTION 'governance_version must increment after feature_matrix and custom_fields_schema changes';
    END IF;

    SELECT COUNT(*)
    INTO v_audit_count
    FROM tenant_config_audit
    WHERE tenant_id = 9101;

    IF v_audit_count < 2 THEN
        RAISE EXCEPTION 'tenant_config_audit must record feature_matrix and custom_fields_schema changes';
    END IF;
END
$$;

RESET ROLE;
ROLLBACK;
