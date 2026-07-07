-- manufacturing_models table
CREATE TABLE IF NOT EXISTS manufacturing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE manufacturing_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON manufacturing_models
  USING (tenant_id = current_setting('app.current_tenant_id')::BIGINT);

CREATE INDEX idx_manufacturing_models_tenant ON manufacturing_models(tenant_id);
