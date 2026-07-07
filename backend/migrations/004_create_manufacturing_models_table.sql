-- Migration: Create manufacturing_models table for Kavana V3
-- This table stores manufacturing models (templates for production orders)

CREATE TABLE IF NOT EXISTS manufacturing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_manufacturing_models_tenant_id ON manufacturing_models(tenant_id);
