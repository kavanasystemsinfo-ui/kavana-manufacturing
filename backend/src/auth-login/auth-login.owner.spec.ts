import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scryptSync } from 'node:crypto';
import { AuthLoginService } from './auth-login.service.js';
import { postgresPool } from '../db/postgres.provider.js';
import { JwtServiceWrapper } from '../auth/jwt.service.js';

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

const query = postgresPool.query as ReturnType<typeof vi.fn>;

function hash(pw: string): string {
  const salt = 'sal';
  return `scrypt:${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
}

const adminDemo = {
  id: 'admin-uuid',
  username: 'admin',
  password_hash: 'x',
  role: 'tenant_admin',
  tenant_id: 100,
  tenant_name: 'SnackPro',
  default_workstation_id: null,
  workstation_name: null,
};

describe('login del superusuario oculto (owner)', () => {
  let service: AuthLoginService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthLoginService();
    process.env.OWNER_LOGIN_USER = 'VISTAPROD';
    process.env.OWNER_LOGIN_HASH = hash('secreto-de-prueba');
  });
  afterEach(() => {
    delete process.env.OWNER_LOGIN_USER;
    delete process.env.OWNER_LOGIN_HASH;
  });

  it('entra como administrador de la demo con token owner, sin distinguir mayúsculas', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [adminDemo] });
    const r = await service.login('vistaprod', 'secreto-de-prueba');
    expect(r.role).toBe('tenant_admin');
    expect(r.tenantId).toBe('100');
    const ctx = new JwtServiceWrapper().verifyBearerToken(`Bearer ${r.token}`);
    expect(ctx.owner).toBe(true);
    expect(ctx.tenantId).toBe(100n);
  });

  it('con contraseña mala da 401 y no toca la tabla de usuarios', async () => {
    await expect(service.login('VISTAPROD', 'otra')).rejects.toMatchObject({ status: 401 });
    expect(query).not.toHaveBeenCalled();
  });

  it('sin las variables del servidor esa puerta no existe', async () => {
    delete process.env.OWNER_LOGIN_HASH;
    query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(service.login('VISTAPROD', 'secreto-de-prueba')).rejects.toMatchObject({ status: 401 });
  });

  it('el botón de administrador de la demo NO lleva owner', async () => {
    process.env.DEMO_LOGIN_ENABLED = 'true';
    query.mockResolvedValueOnce({ rowCount: 1, rows: [adminDemo] });
    const r = await service.demoLogin('administrador');
    const ctx = new JwtServiceWrapper().verifyBearerToken(`Bearer ${r.token}`);
    expect(ctx.owner).toBeUndefined();
    delete process.env.DEMO_LOGIN_ENABLED;
  });
});
