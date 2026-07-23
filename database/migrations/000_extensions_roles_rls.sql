-- ============================================================================
-- KAVANA V3 - Migration 000 (Supabase-compatible)
-- Purpose: PostgreSQL extensions and shared RLS helpers.
-- Compatible with Supabase's managed Postgres (no LEAKPROOF, no CREATE ROLE)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Nota: no se crea el rol kavana_app porque Supabase no permite crear roles.
-- En su lugar, el backend se conecta como postgres (usuario principal de Supabase)
-- que tiene acceso completo a todas las tablas.

-- La función get_current_tenant() se usa para RLS en producción.
-- Sin LEAKPROOF porque Supabase lo restringe (no afecta la funcionalidad).
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::BIGINT;
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
