import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CoreMesProductionService } from './core-mes-production.service.js';
import { TenantCapabilitiesService } from '../tenant-capabilities/tenant-capabilities.service.js';
import { BadRequestException } from '@nestjs/common';

const { mockQuery, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockConnect: vi.fn(),
}));

vi.mock('../db/postgres.provider.js', () => {
  return {
    postgresPool: {
      query: mockQuery,
      connect: mockConnect,
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
    mockConnect.mockReset();
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

    mockConnect.mockImplementationOnce(() => {
      // withTenantTransaction for INSERT
      let callCount = 0;
      return {
        query: vi.fn().mockImplementation((text) => {
          callCount++;
          if (text === 'BEGIN') {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.startsWith("SELECT set_config('app.current_tenant_id'")) {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.trim().startsWith('INSERT')) {
            return Promise.resolve({
              rows: [{ id: 'order-1', code: 'OF-001', target_quantity: 100, workstation_id: 'ws-1', custom_fields: { lote: 'L-2026-A', temperatura: 22.5 }, status: 'pending', created_by: 'user-01', created_at: new Date(), updated_at: new Date() }],
              rowCount: 1,
            });
          }
          if (text === 'COMMIT') {
            return Promise.resolve({ rowCount: 0 });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
        release: vi.fn(),
      };
    });

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

    mockConnect.mockImplementationOnce(() => {
      // withTenantTransaction for INSERT (will fail validation, but we still need to mock it)
      let callCount = 0;
      return {
        query: vi.fn().mockImplementation((text) => {
          callCount++;
          if (text === 'BEGIN') {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.startsWith("SELECT set_config('app.current_tenant_id'")) {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.trim().startsWith('INSERT')) {
            return Promise.resolve({
              rows: [{ id: 'order-1', code: 'OF-001', target_quantity: 100, workstation_id: 'ws-1', custom_fields: {}, status: 'pending', created_by: 'user-01', created_at: new Date(), updated_at: new Date() }],
              rowCount: 1,
            });
          }
          if (text === 'COMMIT') {
            return Promise.resolve({ rowCount: 0 });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
        release: vi.fn(),
      };
    });

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

    mockConnect.mockImplementationOnce(() => {
      // withTenantTransaction for INSERT (will fail validation)
      let callCount = 0;
      return {
        query: vi.fn().mockImplementation((text) => {
          callCount++;
          if (text === 'BEGIN') {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.startsWith("SELECT set_config('app.current_tenant_id'")) {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.trim().startsWith('INSERT')) {
            return Promise.resolve({
              rows: [{ id: 'order-1', code: 'OF-001', target_quantity: 100, workstation_id: 'ws-1', custom_fields: { lote: 'L-2026-A', hacker_field: 'exploit' }, status: 'pending', created_by: 'user-01', created_at: new Date(), updated_at: new Date() }],
              rowCount: 1,
            });
          }
          if (text === 'COMMIT') {
            return Promise.resolve({ rowCount: 0 });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
        release: vi.fn(),
      };
    });

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

    mockConnect.mockImplementationOnce(() => {
      // tenantQuery for UPDATE
      return {
        query: vi.fn().mockImplementation((text) => {
          if (text === 'BEGIN') {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.startsWith("SELECT set_config('app.current_tenant_id'")) {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.includes('UPDATE orders')) {
            return Promise.resolve({
              rows: [{ id: 'order-1', code: 'OF-001', custom_fields: { material: 'acero', lote: 'L-001' } }],
              rowCount: 1,
            });
          }
          if (text === 'COMMIT') {
            return Promise.resolve({ rowCount: 0 });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
        release: vi.fn(),
      };
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

    mockConnect.mockImplementationOnce(() => {
      // tenantQuery for UPDATE
      return {
        query: vi.fn().mockImplementation((text) => {
          if (text === 'BEGIN') {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.startsWith("SELECT set_config('app.current_tenant_id'")) {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.trim().startsWith('UPDATE')) {
            return Promise.resolve({
              rows: [{ id: 'order-1', code: 'OF-001', custom_fields: { material: 'acero', hacker_field: 'exploit' } }],
              rowCount: 1,
            });
          }
          if (text === 'COMMIT') {
            return Promise.resolve({ rowCount: 0 });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
        release: vi.fn(),
      };
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

    mockConnect.mockImplementationOnce(() => {
      // tenantQuery for UPDATE
      return {
        query: vi.fn().mockImplementation((text) => {
          if (text === 'BEGIN') {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.startsWith("SELECT set_config('app.current_tenant_id'")) {
            return Promise.resolve({ rowCount: 0 });
          }
          if (text.trim().startsWith('UPDATE')) {
            return Promise.resolve({
              rows: [],
              rowCount: 0,
            });
          }
          if (text === 'COMMIT') {
            return Promise.resolve({ rowCount: 0 });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }),
        release: vi.fn(),
      };
    });

    await expect(
      service.updateCustomFields('non-existent', { custom_fields: {} }),
    ).rejects.toThrow(BadRequestException);
  });
});
