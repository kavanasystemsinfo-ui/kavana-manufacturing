-- ============================================================================
-- KAVANA V3 - Database Migration 004
-- Purpose: Immutable production time logs for HMI events and offline sync.
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_time_logs (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL,
    workstation_id UUID NOT NULL,
    operator_id UUID NOT NULL,

    client_event_id UUID NOT NULL DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'stop')),
    downtime_reason TEXT DEFAULT NULL,

    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE,

    is_offline_event BOOLEAN NOT NULL DEFAULT FALSE,
    client_device_id TEXT DEFAULT NULL,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT uk_production_time_logs_client_event
        UNIQUE (tenant_id, client_event_id),
    CONSTRAINT fk_production_time_logs_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_production_time_logs_order
        FOREIGN KEY (tenant_id, order_id)
        REFERENCES production_orders(tenant_id, id)
        ON DELETE CASCADE,
    CONSTRAINT fk_production_time_logs_workstation
        FOREIGN KEY (tenant_id, workstation_id)
        REFERENCES workstations(tenant_id, id)
        ON DELETE CASCADE,
    CONSTRAINT fk_production_time_logs_operator
        FOREIGN KEY (tenant_id, operator_id)
        REFERENCES users(tenant_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_production_time_logs_downtime_reason
        CHECK (event_type <> 'pause' OR downtime_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_time_logs_performance
    ON production_time_logs (tenant_id, order_id, registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_logs_tenant_operator
    ON production_time_logs (tenant_id, operator_id, registered_at DESC);

ALTER TABLE production_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_time_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_production_time_logs_tenant_isolation ON production_time_logs;

CREATE POLICY rls_production_time_logs_tenant_isolation
    ON production_time_logs
    FOR ALL
    TO kavana_app
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());
