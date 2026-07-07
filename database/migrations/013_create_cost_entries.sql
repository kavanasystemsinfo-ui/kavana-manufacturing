-- Migration: Create cost_entries table
-- Supports cost management module (cost_management feature flag)

CREATE TABLE IF NOT EXISTS cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('material', 'labor', 'overhead', 'energy')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_entries_tenant ON cost_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_order ON cost_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_category ON cost_entries(category);
CREATE INDEX IF NOT EXISTS idx_cost_entries_created_at ON cost_entries(created_at);

ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY cost_entries_tenant_isolation ON cost_entries
  USING (tenant_id = current_setting('app.current_tenant_id')::int);
