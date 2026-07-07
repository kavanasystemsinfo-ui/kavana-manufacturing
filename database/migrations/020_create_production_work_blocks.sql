-- Migration 020: Create production_work_blocks table (idempotent)
-- ponytail: production_time_logs (004) was created but migration 006 (refactor)
-- was never applied to dev DB. Also adds produced_quantity/defect_quantity
-- which were referenced by CHECK constraints but never created as columns.
-- This migration handles all cases: table exists, time_logs exists, or neither.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'production_work_blocks') THEN
    RAISE NOTICE 'production_work_blocks already exists, adding missing columns if needed';
    ALTER TABLE production_work_blocks ADD COLUMN IF NOT EXISTS produced_quantity NUMERIC(12,4) DEFAULT 0;
    ALTER TABLE production_work_blocks ADD COLUMN IF NOT EXISTS defect_quantity NUMERIC(12,4) DEFAULT 0;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'production_time_logs') THEN
    RAISE NOTICE 'Renaming production_time_logs to production_work_blocks';
    ALTER TABLE production_time_logs RENAME TO production_work_blocks;

    ALTER TABLE production_work_blocks ADD COLUMN IF NOT EXISTS type VARCHAR(50);
    ALTER TABLE production_work_blocks ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
    ALTER TABLE production_work_blocks ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
    ALTER TABLE production_work_blocks ADD COLUMN IF NOT EXISTS produced_quantity NUMERIC(12,4) DEFAULT 0;
    ALTER TABLE production_work_blocks ADD COLUMN IF NOT EXISTS defect_quantity NUMERIC(12,4) DEFAULT 0;

    UPDATE production_work_blocks SET type = 'produccion' WHERE type IS NULL AND event_type IN ('start', 'resume');
    UPDATE production_work_blocks SET type = 'parada' WHERE type IS NULL AND event_type IN ('pause', 'stop');
    UPDATE production_work_blocks SET type = 'produccion' WHERE type IS NULL;
    UPDATE production_work_blocks SET start_time = registered_at WHERE start_time IS NULL;
    UPDATE production_work_blocks SET end_time = COALESCE(synced_at, registered_at + INTERVAL '1 second') WHERE end_time IS NULL;
    UPDATE production_work_blocks SET end_time = start_time + INTERVAL '1 second' WHERE start_time >= end_time;
    ALTER TABLE production_work_blocks ALTER COLUMN type SET NOT NULL;
    ALTER TABLE production_work_blocks ALTER COLUMN start_time SET NOT NULL;
    ALTER TABLE production_work_blocks ALTER COLUMN end_time SET NOT NULL;

    ALTER TABLE production_work_blocks DROP COLUMN IF EXISTS event_type;

    ALTER TABLE production_work_blocks DROP CONSTRAINT IF EXISTS work_blocks_time_check;
    UPDATE production_work_blocks SET downtime_reason = 'sin especificar' WHERE type = 'parada' AND downtime_reason IS NULL;
    ALTER TABLE production_work_blocks ADD CONSTRAINT work_blocks_time_check CHECK (start_time < end_time);

    ALTER TABLE production_work_blocks DROP CONSTRAINT IF EXISTS work_blocks_type_check;
    ALTER TABLE production_work_blocks ADD CONSTRAINT work_blocks_type_check CHECK (
      (type = 'produccion' AND produced_quantity IS NOT NULL) OR
      (type = 'parada' AND downtime_reason IS NOT NULL)
    );

    ALTER TABLE production_work_blocks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE production_work_blocks FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_production_work_blocks_tenant_isolation ON production_work_blocks;
    CREATE POLICY rls_production_work_blocks_tenant_isolation
      ON production_work_blocks FOR ALL TO kavana_app
      USING (tenant_id = get_current_tenant())
      WITH CHECK (tenant_id = get_current_tenant());
    RETURN;
  END IF;

  RAISE NOTICE 'Creating production_work_blocks from scratch';
  CREATE TABLE production_work_blocks (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    workstation_id UUID NOT NULL,
    operator_id UUID NOT NULL,
    client_event_id UUID NOT NULL DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('produccion', 'parada')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    downtime_reason TEXT,
    produced_quantity NUMERIC(12,4) DEFAULT 0,
    defect_quantity NUMERIC(12,4) DEFAULT 0,
    is_offline_event BOOLEAN NOT NULL DEFAULT FALSE,
    client_device_id TEXT,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT uk_pwb_client_event UNIQUE (tenant_id, client_event_id),
    CONSTRAINT fk_pwb_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_pwb_order FOREIGN KEY (tenant_id, order_id) REFERENCES production_orders(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_pwb_workstation FOREIGN KEY (tenant_id, workstation_id) REFERENCES workstations(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_pwb_operator FOREIGN KEY (tenant_id, operator_id) REFERENCES users(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT pwb_time_check CHECK (start_time < end_time),
    CONSTRAINT pwb_type_check CHECK (
      (type = 'produccion' AND produced_quantity IS NOT NULL) OR
      (type = 'parada' AND downtime_reason IS NOT NULL)
    )
  );

  CREATE INDEX idx_pwb_order ON production_work_blocks (tenant_id, order_id, start_time DESC);
  CREATE INDEX idx_pwb_operator ON production_work_blocks (tenant_id, operator_id, start_time DESC);

  ALTER TABLE production_work_blocks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE production_work_blocks FORCE ROW LEVEL SECURITY;
  CREATE POLICY rls_pwb_tenant_isolation
    ON production_work_blocks FOR ALL TO kavana_app
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

  GRANT ALL ON production_work_blocks TO kavana_app;
END $$;
