import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoreMesProductionService } from './core-mes-production/core-mes-production.service.js';
import { TenantCapabilitiesService } from './tenant-capabilities/tenant-capabilities.service.js';
import { BadRequestException } from '@nestjs/common';
import * as tenantContext from './auth/tenant-context.storage.js';
import { syncWorkBlockSchema } from './core-mes-production/dto.js';

vi.mock('./db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

vi.mock('./db/withTenantTransaction.js', () => ({
  withTenantTransaction: vi.fn(async (cb) => cb({ query: vi.fn() })),
}));

vi.mock('./auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

describe('Offline Sync Integrity — syncWorkBlock', () => {
  let service: CoreMesProductionService;
  let capabilitiesService: TenantCapabilitiesService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 1n, userId: 'user-1', role: 'operario' });
    capabilitiesService = { getCapabilities: vi.fn() } as unknown as TenantCapabilitiesService;
    service = new CoreMesProductionService(capabilitiesService);
  });

  describe('DTO validation — syncWorkBlockSchema refinements', () => {
    it('rejects parada without downtime_reason', () => {
      const result = syncWorkBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '1',
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'parada',
        start_time: '2026-06-14T08:00:00+00:00',
        end_time: '2026-06-14T10:00:00+00:00',
      });
      expect(result.success).toBe(false);
    });

    it('rejects produccion without produced_quantity', () => {
      const result = syncWorkBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '1',
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'produccion',
        start_time: '2026-06-14T08:00:00+00:00',
        end_time: '2026-06-14T10:00:00+00:00',
      });
      expect(result.success).toBe(false);
    });

    it('rejects end_time before start_time', () => {
      const result = syncWorkBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '1',
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'produccion',
        start_time: '2026-06-14T10:00:00+00:00',
        end_time: '2026-06-14T08:00:00+00:00',
        produced_quantity: 100,
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid parada with downtime_reason', () => {
      const result = syncWorkBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '1',
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'parada',
        start_time: '2026-06-14T08:00:00+00:00',
        end_time: '2026-06-14T10:00:00+00:00',
        downtime_reason: 'Mantenimiento programado',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid produccion with produced_quantity', () => {
      const result = syncWorkBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '1',
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'produccion',
        start_time: '2026-06-14T08:00:00+00:00',
        end_time: '2026-06-14T10:00:00+00:00',
        produced_quantity: 100,
      });
      expect(result.success).toBe(true);
    });

    it('transforms tenant_id string to BigInt', () => {
      const result = syncWorkBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '42',
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'produccion',
        start_time: '2026-06-14T08:00:00+00:00',
        end_time: '2026-06-14T10:00:00+00:00',
        produced_quantity: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tenant_id).toBe(42n);
      }
    });
  });

  describe('Service-level sync — cross-tenant and idempotency', () => {
    it('uses authenticated tenant context and ignores offline event tenant_id', async () => {
      const mockedClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('FOR UPDATE')) {
            return Promise.resolve({ rows: [{ id: 'order-1', status: 'pending', workstation_id: 'ws-1' }] });
          }
          if (sql.includes('OVERLAPS')) {
            return Promise.resolve({ rows: [] });
          }
          if (sql.includes('INSERT INTO production_work_blocks')) {
            return Promise.resolve({ rowCount: 1, rows: [{ id: 'event-1' }] });
          }
          if (sql.includes('UPDATE orders')) {
            return Promise.resolve({ rows: [{ id: 'order-1', code: 'ORD-1', quantity: 100, produced_quantity: 100, defect_quantity: 0, status: 'in_progress', workstation_id: 'ws-1', custom_fields: {}, created_at: new Date(), updated_at: new Date() }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      const { withTenantTransaction } = await import('./db/withTenantTransaction.js');
      (withTenantTransaction as any).mockImplementation(async (cb: any) => cb(mockedClient));

      const dto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: 99n, // Mismatched tenant_id in offline event payload — should be IGNORED
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'produccion' as const,
        start_time: '2026-06-14T08:00:00Z',
        end_time: '2026-06-14T10:00:00Z',
        produced_quantity: 100,
        is_offline_event: true,
      };

      const result = await service.syncWorkBlock(dto);
      expect(result.synced).toBe(true);

      const overlapCall = mockedClient.query.mock.calls.find(c => (c[0] as string).includes('OVERLAPS'));
      expect(overlapCall?.[1]).toContain('1');
    });

    it('rejects sync when order does not exist', async () => {
      const mockedClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };

      const { withTenantTransaction } = await import('./db/withTenantTransaction.js');
      (withTenantTransaction as any).mockImplementation(async (cb: any) => cb(mockedClient));

      const dto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: 1n,
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'produccion' as const,
        start_time: '2026-06-14T08:00:00Z',
        end_time: '2026-06-14T10:00:00Z',
        produced_quantity: 100,
      };

      await expect(service.syncWorkBlock(dto)).rejects.toThrow(BadRequestException);
    });

    it('rejects sync when time overlaps with existing block', async () => {
      const mockedClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('OVERLAPS')) {
            return Promise.resolve({ rows: [{ exists: 1 }] });
          }
          if (sql.includes('FOR UPDATE')) {
            return Promise.resolve({ rows: [{ id: 'order-1', status: 'in_progress', workstation_id: 'ws-1' }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      const { withTenantTransaction } = await import('./db/withTenantTransaction.js');
      (withTenantTransaction as any).mockImplementation(async (cb: any) => cb(mockedClient));

      const dto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: 1n,
        order_id: '550e8400-e29b-41d4-a716-446655440001',
        workstation_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'produccion' as const,
        start_time: '2026-06-14T08:00:00Z',
        end_time: '2026-06-14T10:00:00Z',
        produced_quantity: 100,
      };

      await expect(service.syncWorkBlock(dto)).rejects.toThrow(BadRequestException);
      await expect(service.syncWorkBlock(dto)).rejects.toThrow('se solapa');
    });
  });
});
