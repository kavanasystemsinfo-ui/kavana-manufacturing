-- ============================================================================
-- KAVANA V3 - Migration 000 (Supabase-compatible)
-- Purpose: PostgreSQL extensions, RLS role and shared RLS helpers.
-- Compatible with Supabase's managed Postgres (no LEAKPROOF, no CREATE ROLE)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- FIX 2026-09-22: la 001 hace `CREATE POLICY ... TO kavana_app`, así que el rol
-- tiene que existir antes. Antes esta migración se limitaba a no crearlo
-- asumiendo que ya estaba, y eso cortaba la cadena en cualquier Postgres que no
-- fuera un Supabase con el rol creado a mano: la 001 fallaba con
-- 'role "kavana_app" does not exist' y la base se quedaba con 2 tablas de 17.
-- Se crea de forma idempotente y tolerante: en un Postgres gestionado que
-- prohíbe CREATE ROLE el bloque no hace nada y la cadena sigue igual que antes.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kavana_app') THEN
        CREATE ROLE kavana_app NOLOGIN;
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'No se pudo crear el rol kavana_app; se asume preexistente (Postgres gestionado).';
END
$$;

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
