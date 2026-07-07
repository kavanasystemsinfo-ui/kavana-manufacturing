import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TenantCapabilitiesController } from './tenant-capabilities.controller.js';
import { TenantCapabilitiesService } from './tenant-capabilities.service.js';

// Mock del context storage
vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn().mockReturnValue({ tenantId: 'tenant-1', userId: 'user-1' }),
}));

describe('TenantCapabilitiesController', () => {
  let controller: TenantCapabilitiesController;
  let serviceMock: Record<keyof TenantCapabilitiesService, any>;

  beforeEach(() => {
    serviceMock = {
      getCapabilities: vi.fn(),
      toggleModule: vi.fn(),
      updateCustomFieldsSchema: vi.fn(),
    };

    controller = new TenantCapabilitiesController(
      serviceMock as unknown as TenantCapabilitiesService,
    );
  });

  describe('getCapabilities', () => {
    it('debería serializar el tenantId (BigInt) como string', async () => {
      serviceMock.getCapabilities.mockResolvedValue({
        tenantId: 1n,
        governanceVersion: 1,
        modules: {},
        quotas: {},
        customFieldsSchema: {},
      });

      const result = await controller.getCapabilities();

      expect(result.tenantId).toBe('1');
    });
  });

  describe('toggleModule', () => {
    it('debería lanzar BadRequestException si enabled no es un booleano', async () => {
      await expect(controller.toggleModule('oee', 'true' as any)).rejects.toThrow(BadRequestException);
    });

    it('debería llamar al servicio con el tenantId del contexto', async () => {
      await controller.toggleModule('oee', true);

      expect(serviceMock.toggleModule).toHaveBeenCalledWith('tenant-1', 'user-1', 'oee', true);
    });
  });

  describe('updateCustomFieldsSchema', () => {
    it('debería delegar el payload al servicio usando el contexto seguro', async () => {
      const payload = { fields: [] };
      await controller.updateCustomFieldsSchema(payload);

      expect(serviceMock.updateCustomFieldsSchema).toHaveBeenCalledWith('tenant-1', 'user-1', payload);
    });
  });
});
