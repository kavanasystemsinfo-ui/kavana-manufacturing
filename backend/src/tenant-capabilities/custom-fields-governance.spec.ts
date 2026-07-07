import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

const postgresPoolMock = vi.hoisted(() => ({
  connect: vi.fn(),
}));

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: postgresPoolMock,
}));

import { TenantCapabilitiesService } from './tenant-capabilities.service.js';

describe('Custom Fields Governance (Quota and Validation)', () => {
  let service: TenantCapabilitiesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantCapabilitiesService();
  });

  it('allows schema within quota', async () => {
    vi.spyOn(service, 'getCapabilities').mockResolvedValue({
      tenantId: 1n,
      governanceVersion: 1,
      modules: { core_mes: { enabled: true, features: {} } },
      quotas: { entities: { max_custom_fields: 5 } },
      customFieldsSchema: {},
    });

    const fakeHardLimits = { storage: { limit_gb: 500 } };
    const mockClient = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('hard_limits')) {
          return Promise.resolve({ rows: [{ hard_limits: fakeHardLimits }], rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 1 });
      }),
      release: vi.fn(),
    };
    postgresPoolMock.connect.mockResolvedValue(mockClient as any);

    const validSchema = {
      fields: [
        { key: 'lote', type: 'string', required: true },
        { key: 'prioridad', type: 'number', required: false },
      ],
    };

    await expect(service.updateCustomFieldsSchema(1n, 'admin-1', validSchema)).resolves.not.toThrow();
  });

  it('rejects schema structure with invalid key format', async () => {
    const invalidSchema = {
      fields: [
        { key: 'LOTE-INVALIDO', type: 'string', required: true },
      ],
    };

    await expect(service.updateCustomFieldsSchema(1n, 'admin-1', invalidSchema)).rejects.toThrow(
      ForbiddenException
    );
  });

  it('rejects schema exceeding quota', async () => {
    vi.spyOn(service, 'getCapabilities').mockResolvedValue({
      tenantId: 1n,
      governanceVersion: 1,
      modules: { core_mes: { enabled: true, features: {} } },
      quotas: { entities: { max_custom_fields: 2 } },
      customFieldsSchema: {},
    });

    postgresPoolMock.connect.mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
      release: vi.fn(),
    } as any);

    const heavySchema = {
      fields: [
        { key: 'campo1', type: 'string' },
        { key: 'campo2', type: 'number' },
        { key: 'campo3', type: 'boolean' },
      ],
    };

    await expect(service.updateCustomFieldsSchema(1n, 'admin-1', heavySchema)).rejects.toThrow(
      ForbiddenException
    );
  });
});
