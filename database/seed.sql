-- Seed para Kavana Manufacturing — entorno de desarrollo
-- Crea tenant demo + usuarios con sus roles

-- Asegurar que el tenant demo existe
INSERT INTO tenants (id, name, subdomain, status)
VALUES (1, 'Demo Manufacturing', 'demo', 'active')
ON CONFLICT (id) DO NOTHING;

-- Añadir columna password_hash si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Usuarios de prueba con contraseñas hasheadas (SHA256)
INSERT INTO users (tenant_id, username, password_hash, role)
VALUES (1, 'admin@kavana.com', '460c743af3c4591187746c9b493ac67b:ef2047a15b8df7ecddb5c08737eba4fe68c5fb38eb717a263ec807f29a8e8f81', 'tenant_admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (tenant_id, username, password_hash, role)
VALUES (1, 'supervisor@kavana.com', 'b533abc17e66f2e88da6e7e6f08a8a39:df33fbebf7bc4efbfbf2379d47646e3719b31a8af3436b2a5587b994f095a780', 'supervisor')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (tenant_id, username, password_hash, role)
VALUES (1, 'operario01@kavana.com', 'c5598d9ef50e9b95519fc9e5ea4f89cf:b7a04ae9e046fec1b73e840a11729f164cc4af3d0c145b671ea09fc2f5290b39', 'operario')
ON CONFLICT (username) DO NOTHING;
