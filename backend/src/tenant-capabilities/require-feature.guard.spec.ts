import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequireFeatureGuard } from './require-feature.guard.js';
import { TenantCapabilitiesService } from './tenant-capabilities.service.js';
import { REQUIRED_FEATURE_KEY } from './require-feature.decorator.js';

// Mock del storage de contexto (AsyncLocalStorage)
vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn().mockReturnValue({ tenantId: 'tenant-1' }),
}));

describe('RequireFeatureGuard', () => {
  let guard: RequireFeatureGuard;
  let reflectorMock: { get: any };
  let capabilitiesMock: { isModuleEnabled: any };
  let contextMock: ExecutionContext;

  beforeEach(() => {
    reflectorMock = {
      get: vi.fn(),
    };
    capabilitiesMock = {
      isModuleEnabled: vi.fn(),
    };
    guard = new RequireFeatureGuard(
      reflectorMock as unknown as Reflector,
      capabilitiesMock as unknown as TenantCapabilitiesService,
    );

    contextMock = {
      getHandler: vi.fn(),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debería permitir el acceso si el controlador no tiene el decorador @RequireFeature (Fase Roja: forzamos fallo temporal)', async () => {
    reflectorMock.get.mockReturnValue(undefined);

    const result = await guard.canActivate(contextMock);

    // FASE VERDE: El guard permite el acceso si no hay decorador
    expect(result).toBe(true); 
  });

  it('debería lanzar ForbiddenException si el módulo está desactivado para el tenant', async () => {
    reflectorMock.get.mockReturnValue('oee_module');
    capabilitiesMock.isModuleEnabled.mockResolvedValue(false);

    await expect(guard.canActivate(contextMock)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(contextMock)).rejects.toThrow(
      "Module 'oee_module' is not enabled for this tenant."
    );
  });

  it('debería permitir el acceso si el módulo está activado', async () => {
    reflectorMock.get.mockReturnValue('oee_module');
    capabilitiesMock.isModuleEnabled.mockResolvedValue(true);

    const result = await guard.canActivate(contextMock);
    expect(result).toBe(true);
  });
});
