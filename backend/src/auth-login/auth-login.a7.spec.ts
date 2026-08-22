import { createHash, randomBytes } from 'node:crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthLoginService } from './auth-login.service.js';
import { postgresPool } from '../db/postgres.provider.js';

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

// scryptSync real (no mock): los tests de hash/verify necesitan la función real.
const service = new AuthLoginService();

function mockUserRow(overrides: Record<string, unknown> = {}) {
  return {
    rows: [
      {
        id: 'u1',
        username: 'admin',
        password_hash: service.hashPassword('correct-horse'),
        role: 'tenant_admin',
        tenant_id: 1,
        tenant_name: 'SolTech',
      },
      ...[],
    ],
    rowCount: 1,
    ...overrides,
  };
}

function queryReturns(rows: unknown[], rowCount?: number) {
  (postgresPool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
    rows,
    rowCount: rowCount ?? rows.length,
  });
}

describe('AuthLoginService — lockout progresivo por cuenta (A7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.resetAccountLocks();
  });

  it('login correcto tras fallos aislados no bloquea', async () => {
    queryReturns([]);
    await expect(service.login('ghost', 'x')).rejects.toMatchObject({ status: 401 });
    queryReturns(mockUserRow().rows);
    await expect(service.login('admin', 'correct-horse')).resolves.toMatchObject({ role: 'tenant_admin' });
  });

  it('5 fallos consecutivos → 429 aunque las credenciales pasen', async () => {
    queryReturns(mockUserRow().rows);
    for (let i = 0; i < 5; i++) {
      await expect(service.login('admin', 'wrong')).rejects.toMatchObject({ status: 401 });
    }
    await expect(service.login('admin', 'correct-horse')).rejects.toMatchObject({ status: 429 });
  });

  it('login correcto resetea el contador de fallos', async () => {
    queryReturns(mockUserRow().rows);
    for (let i = 0; i < 3; i++) {
      await expect(service.login('admin', 'wrong')).rejects.toBeTruthy();
    }
    await expect(service.login('admin', 'correct-horse')).resolves.toBeTruthy();
    // el contador empezó de cero: hacen falta 5 fallos de nuevo
    for (let i = 0; i < 4; i++) {
      await expect(service.login('admin', 'wrong')).rejects.toMatchObject({ status: 401 });
    }
    // el 5º fallo desde el reset dispara el bloqueo
    await expect(service.login('admin', 'wrong')).rejects.toMatchObject({ status: 401 });
    await expect(service.login('admin', 'correct-horse')).rejects.toMatchObject({ status: 429 });
  });

  it('el bloqueo caduca pasado LOCKOUT_MS', async () => {
    queryReturns(mockUserRow().rows);
    for (let i = 0; i < 5; i++) {
      await expect(service.login('admin', 'wrong')).rejects.toBeTruthy();
    }
    await expect(service.login('admin', 'correct-horse')).rejects.toMatchObject({ status: 429 });
    // viaja en el tiempo más allá de la ventana
    const future = Date.now() + 16 * 60 * 1000;
    const spy = vi.spyOn(Date, 'now').mockReturnValue(future);
    await expect(service.login('admin', 'correct-horse')).resolves.toBeTruthy();
    spy.mockRestore();
  });

  it('usuarios distintos no se bloquean entre sí', async () => {
    queryReturns(mockUserRow().rows);
    for (let i = 0; i < 5; i++) {
      await expect(service.login('admin', 'wrong')).rejects.toBeTruthy();
    }
    queryReturns([
      { id: 'u2', username: 'op', password_hash: service.hashPassword('op-pass'), role: 'operator', tenant_id: 1, tenant_name: 'SolTech' },
    ]);
    await expect(service.login('op', 'op-pass')).resolves.toBeTruthy();
  });
});

describe('AuthLoginService — migración legacy sha256 → scrypt (A7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.resetAccountLocks();
  });

  function legacySha256(password: string): string {
    // formato legacy sin prefijo: salt:hash con sha256(salt+password)
    const salt = randomBytes(8).toString('hex');
    return `${salt}:${createHash('sha256').update(salt + password).digest('hex')}`;
  }

  it('login contra hash legacy funciona y re-hashea a scrypt', async () => {
    const legacyHash = legacySha256('old-secret');
    queryReturns([
      { id: 'u3', username: 'legacy', password_hash: legacyHash, role: 'tenant_admin', tenant_id: 1, tenant_name: 'SolTech' },
    ]);
    const result = await service.login('legacy', 'old-secret');
    expect(result.token).toBeTruthy();

    // el UPDATE de re-hash ocurrió con el formato nuevo
    const updateCall = (postgresPool.query as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => String(c[0]).includes('UPDATE users SET password_hash'),
    );
    expect(updateCall).toBeTruthy();
    expect(updateCall![1][0]).toMatch(/^scrypt:/);
  });

  it('fallo contra hash legacy NO dispara re-hash', async () => {
    const legacyHash = legacySha256('old-secret');
    queryReturns([
      { id: 'u3', username: 'legacy', password_hash: legacyHash, role: 'tenant_admin', tenant_id: 1, tenant_name: 'SolTech' },
    ]);
    await expect(service.login('legacy', 'nope')).rejects.toBeTruthy();
    const updates = (postgresPool.query as ReturnType<typeof vi.fn>).mock.calls.filter((c) =>
      String(c[0]).includes('UPDATE users SET password_hash'),
    );
    expect(updates.length).toBe(0);
  });

  it('login scrypt normal NO dispara UPDATE redundante', async () => {
    queryReturns(mockUserRow().rows);
    await service.login('admin', 'correct-horse');
    const updates = (postgresPool.query as ReturnType<typeof vi.fn>).mock.calls.filter((c) =>
      String(c[0]).includes('UPDATE users SET password_hash'),
    );
    expect(updates.length).toBe(0);
  });
});
