-- Migration: Create workstations table for Kavana V3
-- This table stores workstations (puestos de trabajo) for manufacturing

CREATE TABLE IF NOT EXISTS workstations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_workstations_tenant_id ON workstations(tenant_id);
