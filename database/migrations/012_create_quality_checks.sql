-- Migration 012 adapted to real production schema (Neon, 2026-08-07)
-- Original failed: FK to workstations(id) requires unique(id) but PK is (tenant_id,id).
-- Real schema (orders) uses NOT NULL constraints without FKs; mirror that.
-- Supports quality assurance module (quality_assurance feature flag)

CREATE TABLE IF NOT EXISTS quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  workstation_id UUID NOT NULL,
  inspector_id TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'conditional')),
  defect_count INTEGER NOT NULL DEFAULT 0 CHECK (defect_count >= 0),
  defect_type TEXT,
  notes TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_tenant ON quality_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_order ON quality_checks(order_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_workstation ON quality_checks(workstation_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_result ON quality_checks(result);
CREATE INDEX IF NOT EXISTS idx_quality_checks_checked_at ON quality_checks(checked_at);

ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY quality_checks_tenant_isolation ON quality_checks
  USING (tenant_id = current_setting('app.current_tenant_id')::int);
