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

function mockRequest(path: string): ExecutionContext {
  return {
    getHandler: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ path }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflectorMock: { get: ReturnType<typeof vi.fn> };
  let contextMock: ExecutionContext;

  beforeEach(() => {
    reflectorMock = { get: vi.fn() };
    guard = new RolesGuard(reflectorMock as unknown as Reflector);
    contextMock = {
      getHandler: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ path: '/users' }) }),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // FIX 2026-08-21 (P0): comportamiento fail-closed. Los dos tests antiguos
  // ("permitir si no hay decorador" y "permitir si el array está vacío")
  // documentaban el agujero de escalada operario → tenant_admin; se
  // sustituyen por su inverso. La cobertura se conserva e invierte.

  it('FAIL-CLOSED: deniega acceso si no hay decorador @RequireRole', () => {
    reflectorMock.get.mockReturnValue(undefined);
    expect(() => guard.canActivate(contextMock)).toThrow(ForbiddenException);
  });

  it('FAIL-CLOSED: deniega acceso si el array de roles requeridos está vacío', () => {
    reflectorMock.get.mockReturnValue([]);
    expect(() => guard.canActivate(contextMock)).toThrow(ForbiddenException);
  });

  it('el mensaje fail-closed explica la política', () => {
    reflectorMock.get.mockReturnValue(undefined);
    try {
      guard.canActivate(contextMock);
    } catch (error) {
      expect((error as ForbiddenException).message).toContain('fail-closed');
    }
  });

  it('permite rutas públicas (login) sin decorador', () => {
    reflectorMock.get.mockReturnValue(undefined);
    const publicCtx = mockRequest('/auth/login');
    expect(guard.canActivate(publicCtx)).toBe(true);
  });

  it('permite rutas públicas (health) sin decorador', () => {
    reflectorMock.get.mockReturnValue(undefined);
    const publicCtx = mockRequest('/health');
    expect(guard.canActivate(publicCtx)).toBe(true);
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
