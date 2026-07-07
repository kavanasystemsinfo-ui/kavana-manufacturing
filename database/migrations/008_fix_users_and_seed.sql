-- Fix users table to match backend: add username, password_hash, drop email/name
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Migrate existing data if any
UPDATE users SET username = email WHERE username IS NULL;
UPDATE users SET password_hash = 'hash_' || name WHERE password_hash IS NULL;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Drop old columns
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS name;

-- Recreate unique index for username
DROP INDEX IF EXISTS idx_users_tenant_email;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username
    ON users (tenant_id, LOWER(username));

-- Insert default tenant if not exists
INSERT INTO tenants (id, name, status, feature_matrix)
VALUES (1, 'Kavana Demo', 'active', '{"modules":{"production":{"enabled":true,"features":{}},"workstations":{"enabled":true,"features":{}}, "users":{"enabled":true,"features":{}}}}'::jsonb)
ON CONFLICT (id) DO NOTHING;
