-- Add V2-style user fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_number INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS operator_category VARCHAR(50) DEFAULT 'peon_especialista';
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_workstation_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Unique employee number per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_employee_number
    ON users (tenant_id, employee_number) WHERE employee_number IS NOT NULL;

-- Index for active users filtering
CREATE INDEX IF NOT EXISTS idx_users_tenant_active
    ON users (tenant_id, is_active);
