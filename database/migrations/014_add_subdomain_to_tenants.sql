-- Migration: Add subdomain column to tenants
-- Enables per-tenant URL routing (e.g., megalux.kavana.app)

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain) WHERE subdomain IS NOT NULL;
