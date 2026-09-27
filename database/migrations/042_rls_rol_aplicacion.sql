-- Migration 042: RLS efectivo (rol de aplicación sin BYPASSRLS)
--
-- Contexto (ADR-009): las políticas de las migraciones 034/037 no filtraban nada en
-- producción porque el rol con el que conecta la aplicación tiene BYPASSRLS, que
-- esquiva las políticas incluso con FORCE. Esta migración prepara el cambio:
--
--   1. El rol `kavana_app` existe y no puede saltarse las políticas. Su contraseña se
--      pone fuera del repositorio (consola de Neon o script de despliegue): aquí solo
--      se garantizan los atributos, que son los que dan la garantía.
--   2. `tenants` entra en RLS: cada planta se ve a sí misma y no ve el catálogo.
--   3. El login necesita resolver planta y usuario ANTES de saber quién entra. Eso se
--      hace con funciones SECURITY DEFINER acotadas que devuelven exactamente la fila
--      necesaria, en lugar de dejar abiertas las tablas (users guarda los hashes de
--      las contraseñas).

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kavana_app') THEN
        CREATE ROLE kavana_app LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END $$;

-- Los atributos se reafirman siempre: si alguien le da BYPASSRLS al rol, el
-- aislamiento se cae sin que nada avise.
ALTER ROLE kavana_app NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;

GRANT USAGE ON SCHEMA public TO kavana_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kavana_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kavana_app;

-- 2. El catálogo de plantas, bajo RLS como el resto.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenants_propia ON tenants;
CREATE POLICY rls_tenants_propia ON tenants
    FOR ALL TO kavana_app
    USING (id = get_current_tenant())
    WITH CHECK (id = get_current_tenant());

-- 3. Accesos acotados para antes de tener contexto de planta.
CREATE OR REPLACE FUNCTION auth_login_lookup(p_usuario TEXT, p_subdominio TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    password_hash TEXT,
    role TEXT,
    tenant_id BIGINT,
    tenant_name TEXT,
    default_workstation_id UUID,
    workstation_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT u.id, u.username, u.password_hash::TEXT, u.role, u.tenant_id, t.name,
           u.default_workstation_id, w.name
    FROM users u
    JOIN tenants t ON t.id = u.tenant_id
    LEFT JOIN workstations w
      ON w.id = u.default_workstation_id AND w.tenant_id = u.tenant_id
    WHERE LOWER(u.username) = LOWER(p_usuario)
      AND (p_subdominio IS NULL OR t.subdomain = p_subdominio)
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_tenant_by_subdomain(p_subdominio TEXT)
RETURNS TABLE (id BIGINT, name TEXT, status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT t.id, t.name, t.status
    FROM tenants t
    WHERE t.subdomain = p_subdominio
    LIMIT 1;
$$;

-- El rehash de contraseñas heredadas (sha256 -> scrypt) ocurre en el login, también
-- sin contexto de planta. Sin esta función el UPDATE afectaría a cero filas y el
-- usuario se quedaría con el hash viejo para siempre.
CREATE OR REPLACE FUNCTION auth_update_password_hash(p_usuario UUID, p_hash TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    UPDATE users SET password_hash = p_hash WHERE id = p_usuario;
$$;

REVOKE ALL ON FUNCTION auth_login_lookup(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_tenant_by_subdomain(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_update_password_hash(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_login_lookup(TEXT, TEXT) TO kavana_app;
GRANT EXECUTE ON FUNCTION auth_tenant_by_subdomain(TEXT) TO kavana_app;
GRANT EXECUTE ON FUNCTION auth_update_password_hash(UUID, TEXT) TO kavana_app;
