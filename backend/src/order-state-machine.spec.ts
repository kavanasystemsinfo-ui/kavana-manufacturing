import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoreMesProductionService } from './core-mes-production/core-mes-production.service.js';
import { TenantCapabilitiesService } from './tenant-capabilities/tenant-capabilities.service.js';
import { postgresPool } from './db/postgres.provider.js';
import { BadRequestException } from '@nestjs/common';
import * as tenantContext from './auth/tenant-context.storage.js';
import { transitionProductionOrderSchema } from './core-mes-production/dto.js';

vi.mock('./db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

vi.mock('./db/withTenantTransaction.js', () => ({
  withTenantTransaction: vi.fn(async (cb) => cb({ query: vi.fn() })),
}));

vi.mock('./auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

describe('Order State Machine — transitionOrder', () => {
  let service: CoreMesProductionService;
  let capabilitiesService: TenantCapabilitiesService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 1n, userId: 'supervisor-1', role: 'supervisor' });
    capabilitiesService = { getCapabilities: vi.fn() } as unknown as TenantCapabilitiesService;
    service = new CoreMesProductionService(capabilitiesService);
  });

  describe('DTO validation — target_status refinements', () => {
    it('rejects target_status = pending (cannot go back)', () => {
      const result = transitionProductionOrderSchema.safeParse({ target_status: 'pending' });
      expect(result.success).toBe(false);
    });

    it('accepts target_status = in_progress', () => {
      const result = transitionProductionOrderSchema.safeParse({ target_status: 'in_progress' });
      expect(result.success).toBe(true);
    });

    it('accepts target_status = completed', () => {
      const result = transitionProductionOrderSchema.safeParse({ target_status: 'completed' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid target_status', () => {
      const result = transitionProductionOrderSchema.safeParse({ target_status: 'cancelada' });
      expect(result.success).toBe(false);
    });
  });

  describe('Service-level transitions', () => {
    it('pending → in_progress requires workstation_id if order has none', async () => {
      const mockedClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('FOR UPDATE')) {
            return Promise.resolve({ rows: [{ id: 'order-1', status: 'pending', workstation_id: null }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      const { withTenantTransaction } = await import('./db/withTenantTransaction.js');
      (withTenantTransaction as any).mockImplementation(async (cb: any) => cb(mockedClient));

      await expect(
        service.transitionOrder('order-1', { target_status: 'in_progress' })
      ).rejects.toThrow(BadRequestException);
    });

    it('pending → in_progress succeeds with workstation_id', async () => {
      const mockedClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('FOR UPDATE')) {
            return Promise.resolve({ rows: [{ id: 'order-1', status: 'pending', workstation_id: null }] });
          }
          if (sql.includes('UPDATE')) {
            return Promise.resolve({ rows: [{ id: 'order-1', status: 'in_progress', workstation_id: 'ws-1' }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      const { withTenantTransaction } = await import('./db/withTenantTransaction.js');
      (withTenantTransaction as any).mockImplementation(async (cb: any) => cb(mockedClient));

      const result = await service.transitionOrder('order-1', {
        target_status: 'in_progress',
        workstation_id: 'ws-1',
      });
      expect(result.status).toBe('in_progress');
    });

    it('in_progress → completed succeeds', async () => {
      const mockedClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('FOR UPDATE')) {
            return Promise.resolve({ rows: [{ id: 'order-1', status: 'in_progress', workstation_id: 'ws-1' }] });
          }
          if (sql.includes('UPDATE')) {
            return Promise.resolve({ rows: [{ id: 'order-1', status: 'completed', workstation_id: 'ws-1' }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      const { withTenantTransaction } = await import('./db/withTenantTransaction.js');
      (withTenantTransaction as any).mockImplementation(async (cb: any) => cb(mockedClient));

      const result = await service.transitionOrder('order-1', { target_status: 'completed' });
      expect(result.status).toBe('completed');
    });

    it('order not found throws BadRequestException', async () => {
      const mockedClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };

      const { withTenantTransaction } = await import('./db/withTenantTransaction.js');
      (withTenantTransaction as any).mockImplementation(async (cb: any) => cb(mockedClient));

      await expect(
        service.transitionOrder('nonexistent-order', { target_status: 'in_progress', workstation_id: 'ws-1' })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
