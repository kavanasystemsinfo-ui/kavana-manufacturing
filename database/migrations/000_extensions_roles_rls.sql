-- ============================================================================
-- KAVANA V3 - Database Migration 000
-- Purpose: PostgreSQL extensions, application role and shared RLS helpers.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'kavana_app'
    ) THEN
        CREATE ROLE kavana_app LOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO kavana_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kavana_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO kavana_app;

DO $$
DECLARE
    sequence_record RECORD;
BEGIN
    FOR sequence_record IN
        SELECT sequence_schema, sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format(
            'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO kavana_app',
            sequence_record.sequence_schema,
            sequence_record.sequence_name
        );
    END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS BIGINT
LANGUAGE sql
STABLE
LEAKPROOF
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
