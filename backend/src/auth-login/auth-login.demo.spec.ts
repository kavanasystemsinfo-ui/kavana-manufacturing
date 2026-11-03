import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthLoginService } from './auth-login.service.js';
import { postgresPool } from '../db/postgres.provider.js';

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

const query = postgresPool.query as ReturnType<typeof vi.fn>;
const service = new AuthLoginService();

function fila(tenantId: number, role: string) {
  return {
    id: 'u1',
    username: 'x',
    password_hash: 'h',
    role,
    tenant_id: tenantId,
    tenant_name: 'SnackPro Alimentación SL',
    default_workstation_id: null,
    workstation_name: null,
  };
}

describe('AuthLoginService.demoLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEMO_LOGIN_ENABLED = 'true';
  });
  afterEach(() => {
    delete process.env.DEMO_LOGIN_ENABLED;
  });

  it('desactivado responde 404', async () => {
    delete process.env.DEMO_LOGIN_ENABLED;
    await expect(service.demoLogin('operario')).rejects.toMatchObject({ status: 404 });
    expect(query).not.toHaveBeenCalled();
  });

  it('rol fuera de la lista da 400 sin consultar la base', async () => {
    await expect(service.demoLogin('superadmin')).rejects.toMatchObject({ status: 400 });
    await expect(service.demoLogin('toString')).rejects.toMatchObject({ status: 400 });
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    ['operario', '1094'],
    ['supervisor', '047'],
    ['administrador', 'admin'],
  ])('%s usa el lookup normal de la planta demo con el usuario %s', async (rol, usuario) => {
    query.mockResolvedValue({ rows: [fila(100, rol)], rowCount: 1 });
    const r = await service.demoLogin(rol);
    expect(query).toHaveBeenCalledWith('SELECT * FROM auth_login_lookup($2, $1) LIMIT 1', ['demo', usuario]);
    expect(r.tenantId).toBe('100');
    expect(r.token).toBeTruthy();
  });

  it('nunca emite sesión de un tenant que no sea el demo', async () => {
    query.mockResolvedValue({ rows: [fila(7, 'tenant_admin')], rowCount: 1 });
    await expect(service.demoLogin('administrador')).rejects.toMatchObject({ status: 400 });
  });
});
