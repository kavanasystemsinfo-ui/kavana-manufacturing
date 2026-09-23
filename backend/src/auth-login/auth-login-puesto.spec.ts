import { describe, it, expect, vi, beforeEach } from 'vitest';

// El login tiene que decir si el operario tiene puesto asignado: sin ese dato, el
// panel solo puede decir «no hay órdenes», que es cierto pero el operario no
// puede arreglarlo. Se mockea el pool para fijar el contrato de la respuesta; la
// consulta se verifica además contra la base de datos real.
const queryMock = vi.fn();
vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: (...args: unknown[]) => queryMock(...args) },
}));

const { AuthLoginService } = await import('./auth-login.service.js');

describe('AuthLoginService — el puesto del operario en la respuesta del login (U1)', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve el puesto y su nombre cuando el usuario lo tiene asignado', async () => {
    const service = new AuthLoginService();
    const hash = service.hashPassword('clave-secreta');
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 'user-1',
          username: '1094',
          password_hash: hash,
          role: 'operario',
          tenant_id: 1,
          tenant_name: 'Demo',
          default_workstation_id: 'ws-1',
          workstation_name: 'Puesto E2E',
        },
      ],
    });

    const res = await service.loginByTenant('demo', '1094', 'clave-secreta');

    expect(res.default_workstation_id).toBe('ws-1');
    expect(res.workstation_name).toBe('Puesto E2E');
  });

  it('devuelve null cuando el operario no tiene puesto, sin impedirle entrar', async () => {
    const service = new AuthLoginService();
    const hash = service.hashPassword('clave-secreta');
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 'user-2',
          username: '1095',
          password_hash: hash,
          role: 'operario',
          tenant_id: 1,
          tenant_name: 'Demo',
          default_workstation_id: null,
          workstation_name: null,
        },
      ],
    });

    const res = await service.loginByTenant('demo', '1095', 'clave-secreta');

    expect(res.token).toBeTruthy();
    expect(res.default_workstation_id).toBeNull();
    expect(res.workstation_name).toBeNull();
  });

  it('resuelve el puesto con LEFT JOIN: un INNER dejaría fuera a quien no tiene puesto', async () => {
    const service = new AuthLoginService();
    const hash = service.hashPassword('clave-secreta');
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 'user-1',
          username: '1094',
          password_hash: hash,
          role: 'operario',
          tenant_id: 1,
          tenant_name: 'Demo',
          default_workstation_id: null,
          workstation_name: null,
        },
      ],
    });

    await service.loginByTenant('demo', '1094', 'clave-secreta');

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/default_workstation_id/);
    expect(sql).toMatch(/LEFT JOIN/i);
    expect(sql).toMatch(/workstation_name/i);
  });
});
