import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RolesGuard } from './roles.guard.js';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

import { getTenantContext } from './tenant-context.storage.js';
const mockGetTenantContext = vi.mocked(getTenantContext);

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflectorMock: { get: ReturnType<typeof vi.fn> };
  let contextMock: ExecutionContext;

  beforeEach(() => {
    reflectorMock = { get: vi.fn() };
    guard = new RolesGuard(reflectorMock as unknown as Reflector);
    contextMock = { getHandler: vi.fn() } as unknown as ExecutionContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debería permitir acceso si no hay decorador @RequireRole', () => {
    reflectorMock.get.mockReturnValue(undefined);
    expect(guard.canActivate(contextMock)).toBe(true);
  });

  it('debería permitir acceso si el array de roles requeridos está vacío', () => {
    reflectorMock.get.mockReturnValue([]);
    expect(guard.canActivate(contextMock)).toBe(true);
  });

  it('debería permitir acceso si el rol del usuario coincide', () => {
    reflectorMock.get.mockReturnValue(['tenant_admin']);
    mockGetTenantContext.mockReturnValue({ tenantId: 1n, userId: 'user-1', role: 'tenant_admin' });
    expect(guard.canActivate(contextMock)).toBe(true);
  });

  it('debería permitir acceso si el rol está en la lista de roles requeridos', () => {
    reflectorMock.get.mockReturnValue(['tenant_admin', 'supervisor']);
    mockGetTenantContext.mockReturnValue({ tenantId: 1n, userId: 'user-1', role: 'supervisor' });
    expect(guard.canActivate(contextMock)).toBe(true);
  });

  it('debería lanzar ForbiddenException si el rol no coincide', () => {
    reflectorMock.get.mockReturnValue(['tenant_admin']);
    mockGetTenantContext.mockReturnValue({ tenantId: 1n, userId: 'user-1', role: 'operario' });
    expect(() => guard.canActivate(contextMock)).toThrow(ForbiddenException);
  });

  it('debería incluir los roles requeridos en el mensaje de error', () => {
    reflectorMock.get.mockReturnValue(['tenant_admin', 'supervisor']);
    mockGetTenantContext.mockReturnValue({ tenantId: 1n, userId: 'user-1', role: 'operario' });
    try {
      guard.canActivate(contextMock);
    } catch (error) {
      expect((error as ForbiddenException).message).toContain('tenant_admin');
      expect((error as ForbiddenException).message).toContain('supervisor');
    }
  });
});
