-- ============================================================================
-- Seed de desarrollo — Kavana Manufacturing
-- ============================================================================
-- Crea el tenant demo y las tres cuentas que anuncia la pantalla de login
-- (frontend/src/LoginPage.tsx): admin/admin123, 047/kavana y 1094/kavana.
--
-- SOLO PARA DESARROLLO. Esas contraseñas están publicadas en la UI del demo,
-- así que este fichero NO debe aplicarse contra una base de producción:
-- crearía un administrador con contraseña conocida.
--
-- Es idempotente: se puede aplicar tantas veces como haga falta. No usa
-- ON CONFLICT contra `username` porque el índice único real es
-- (tenant_id, LOWER(username)); el ON CONFLICT anterior no casaba con ninguna
-- restricción y el seed fallaba entero antes de insertar nada.
--
-- Uso:
--   psql "$DATABASE_URL" -f database/seed.sql
-- ============================================================================

-- El login por subdominio (AuthLoginService.loginByTenant) busca el tenant por
-- subdominio, y la UI anuncia "tenant: demo".
INSERT INTO tenants (id, name, subdomain, status)
VALUES (1, 'Demo Manufacturing', 'demo', 'active')
ON CONFLICT (id) DO UPDATE
    SET subdomain = COALESCE(tenants.subdomain, EXCLUDED.subdomain);

-- Contraseñas en el formato legacy del backend (salt:sha256(salt+password)),
-- que verifyPassword acepta y re-hashea a scrypt en el primer login correcto.
-- Se calcula con pgcrypto (habilitado por la migración 000) en lugar de
-- incrustar blobs opacos, para que se vea de dónde sale cada hash.
INSERT INTO users (tenant_id, username, password_hash, role, is_active, first_name, last_name)
SELECT 1,
       v.username,
       v.salt || ':' || encode(digest(v.salt || v.password, 'sha256'), 'hex'),
       v.role,
       true,
       v.first_name,
       v.last_name
FROM (VALUES
    ('admin', 'admin123', '9f1c0d7a4b2e5386a0d4c1f7b93e2a58', 'tenant_admin', 'Admin',      'Demo'),
    ('047',   'kavana',   '3b7e91c4f0a62d8517ce94b0f3d1a6c2', 'supervisor',   'Supervisor', 'Demo'),
    ('1094',  'kavana',   'c48a1f60d3b952e7a1c0f84d7b26e9a3', 'operario',     'Operario',   'Demo')
) AS v(username, password, salt, role, first_name, last_name)
WHERE NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.tenant_id = 1 AND LOWER(u.username) = LOWER(v.username)
);
