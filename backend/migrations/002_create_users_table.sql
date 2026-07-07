-- Migration: Create users table for Kavana V3
-- This table stores user accounts with role-based access control

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('tenant_admin', 'supervisor', 'operario')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, username)
);

-- Index for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- Index for unique username per tenant
CREATE INDEX IF NOT EXISTS idx_users_tenant_username ON users(tenant_id, username);
