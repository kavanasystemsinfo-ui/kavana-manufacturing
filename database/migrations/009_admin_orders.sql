-- Migration 009: Admin panel orders table (simplified CRUD for order management)
-- ponytail: distinct from production_orders — this is the admin panel entity for managing orders

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  model_id UUID NOT NULL,
  workstation_id UUID NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_tenant_isolation ON orders;

CREATE POLICY orders_tenant_isolation ON orders
  FOR ALL TO kavana_app
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

GRANT ALL ON orders TO kavana_app;

CREATE TRIGGER trg_orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
