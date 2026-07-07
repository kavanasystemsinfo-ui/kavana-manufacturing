-- Migration: Create orders table for Kavana V3
-- This table stores production orders created by supervisors

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  model_id UUID NOT NULL REFERENCES manufacturing_models(id),
  workstation_id UUID NOT NULL REFERENCES workstations(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(tenant_id, status);
