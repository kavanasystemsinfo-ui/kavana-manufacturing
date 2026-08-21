import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

// Regression 2026-08-21 (P0): auto-escalada de rol.
// Antes: PUT /users/<propio-id> con {"role":"tenant_admin"} elevaba al
// operario a admin. Ahora UsersController exige tenant_admin (RolesGuard
// global fail-closed) y UsersService prohíbe cambiar el rol propio.

// El service importa tenant-context.storage (con postgresPool); mockear el
// pool antes del import para no necesitar BD.
vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn(), connect: vi.fn() },
}));

import { UsersService } from './users.service.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));
const mockGetTenantContext = vi.mocked(getTenantContext);

describe('UsersService — auto-escalada de rol (regression P0)', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService();
  });

  it('prohíbe que un usuario cambie su PROPIO rol', async () => {
    mockGetTenantContext.mockReturnValue({ tenantId: 1n, userId: 'me-1', role: 'tenant_admin' });

    await expect(
      service.updateUser('me-1', { role: 'tenant_admin' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('prohíbe auto-escalada aunque el rol destino sea inferior (consistencia)', async () => {
    mockGetTenantContext.mockReturnValue({ tenantId: 1n, userId: 'me-1', role: 'tenant_admin' });

    await expect(
      service.updateUser('me-1', { role: 'operario' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite cambiar el rol de OTRO usuario (operación admin válida)', async () => {
    mockGetTenantContext.mockReturnValue({ tenantId: 1n, userId: 'admin-1', role: 'tenant_admin' });

    // El query real va a BD; mockear tenantQuery via postgresPool no es
    // trivial (usa client.connect). Validamos solo la lógica del guard:
    // si llega aquí sin lanzar, el check de auto-escalada pasó.
    const promise = service.updateUser('other-user', { role: 'supervisor' });
    // No debe rechazar con ForbiddenException por auto-escalada; puede
    // fallar por BD (no conectada en test unitario), lo cual es aceptable.
    await expect(promise).rejects.not.toThrow(ForbiddenException);
  });
});
