import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CoreMesProductionService } from './core-mes-production.service.js';
import { TenantCapabilitiesService } from '../tenant-capabilities/tenant-capabilities.service.js';
import { BadRequestException } from '@nestjs/common';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn().mockResolvedValue({ rows: [{ id: 'order-1', custom_fields: {} }], rowCount: 1 }),
}));

vi.mock('../db/postgres.provider.js', () => {
  return {
    postgresPool: {
      query: mockQuery,
      connect: vi.fn(() => ({
        query: vi.fn().mockResolvedValue({ rows: [{ id: 'order-1' }] }),
        release: vi.fn(),
      })),
    },
  };
});

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: () => ({
    tenantId: 1n,
    userId: 'user-01',
    role: 'operario',
  }),
}));

describe('Core MES Production - Custom Fields Dynamic Validation', () => {
  let service: CoreMesProductionService;
  let capabilitiesService: TenantCapabilitiesService;

  beforeEach(() => {
    vi.restoreAllMocks();
    capabilitiesService = new TenantCapabilitiesService();
    service = new CoreMesProductionService(capabilitiesService);
  });

  it('allows order creation with valid custom fields', async () => {
    vi.spyOn(capabilitiesService, 'getCapabilities').mockResolvedValue({
      tenantId: 1n,
      governanceVersion: 1,
      modules: { core_mes: { enabled: true, features: {} } },
      quotas: {},
      customFieldsSchema: {
        production_orders: {
          fields: [
            { key: 'lote', type: 'string', required: true },
            { key: 'temperatura', type: 'number', required: false },
          ],
        },
      },
    });

    const dto = {
      code: 'OF-001',
      target_quantity: 100,
      workstation_id: 'ws-1',
      custom_fields: {
        lote: 'L-2026-A',
        temperatura: 22.5,
      },
    };

    await expect(service.createOrder(dto)).resolves.not.toThrow();
  });

  it('rejects order creation when a required custom field is missing', async () => {
    vi.spyOn(capabilitiesService, 'getCapabilities').mockResolvedValue({
      tenantId: 1n,
      governanceVersion: 1,
      modules: { core_mes: { enabled: true, features: {} } },
      quotas: {},
      customFieldsSchema: {
        production_orders: {
          fields: [
            { key: 'lote', type: 'string', required: true },
          ],
        },
      },
    });

    const dto = {
      code: 'OF-001',
      target_quantity: 100,
      workstation_id: 'ws-1',
      custom_fields: {}, // missing required field 'lote'
    };

    await expect(service.createOrder(dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects order creation when an extra property is present (strict)', async () => {
    vi.spyOn(capabilitiesService, 'getCapabilities').mockResolvedValue({
      tenantId: 1n,
      governanceVersion: 1,
      modules: { core_mes: { enabled: true, features: {} } },
      quotas: {},
      customFieldsSchema: {
        production_orders: {
          fields: [
            { key: 'lote', type: 'string', required: true },
          ],
        },
      },
    });

    const dto = {
      code: 'OF-001',
      target_quantity: 100,
      workstation_id: 'ws-1',
      custom_fields: {
        lote: 'L-2026-A',
        hacker_field: 'exploit', // undeclared field
      },
    };

    await expect(service.createOrder(dto)).rejects.toThrow(BadRequestException);
  });

  it('allows updating custom fields on an existing order', async () => {
    vi.spyOn(capabilitiesService, 'getCapabilities').mockResolvedValue({
      tenantId: 1n,
      governanceVersion: 1,
      modules: { core_mes: { enabled: true, features: {} } },
      quotas: {},
      customFieldsSchema: {
        production_orders: {
          fields: [
            { key: 'material', type: 'string', required: false },
            { key: 'lote', type: 'string', required: false },
          ],
        },
      },
    });

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'order-1', code: 'OF-001', custom_fields: { material: 'acero', lote: 'L-001' } }],
      rowCount: 1,
    });

    const result = await service.updateCustomFields('order-1', {
      custom_fields: { material: 'acero', lote: 'L-001' },
    });

    expect(result).toBeDefined();
    expect(result.custom_fields).toEqual({ material: 'acero', lote: 'L-001' });
  });

  it('rejects update with undeclared custom fields (strict)', async () => {
    vi.spyOn(capabilitiesService, 'getCapabilities').mockResolvedValue({
      tenantId: 1n,
      governanceVersion: 1,
      modules: { core_mes: { enabled: true, features: {} } },
      quotas: {},
      customFieldsSchema: {
        production_orders: {
          fields: [
            { key: 'material', type: 'string', required: false },
          ],
        },
      },
    });

    await expect(
      service.updateCustomFields('order-1', {
        custom_fields: { material: 'acero', hacker_field: 'exploit' },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects update when order does not exist', async () => {
    vi.spyOn(capabilitiesService, 'getCapabilities').mockResolvedValue({
      tenantId: 1n,
      governanceVersion: 1,
      modules: { core_mes: { enabled: true, features: {} } },
      quotas: {},
      customFieldsSchema: { production_orders: { fields: [] } },
    });

    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(
      service.updateCustomFields('non-existent', { custom_fields: {} }),
    ).rejects.toThrow(BadRequestException);
  });
});
