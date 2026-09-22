import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoreMesProductionService } from './core-mes-production.service.js';
import { TenantCapabilitiesService } from '../tenant-capabilities/tenant-capabilities.service.js';
import { postgresPool } from '../db/postgres.provider.js';
import { BadRequestException } from '@nestjs/common';
import * as tenantContext from '../auth/tenant-context.storage.js';

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));
vi.mock('../db/withTenantTransaction.js', () => ({
  withTenantTransaction: vi.fn(async (cb) => cb({ query: vi.fn() })),
}));
vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

describe('CoreMesProductionService - syncWorkBlock', () => {
  let service: CoreMesProductionService;
  let capabilitiesService: TenantCapabilitiesService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 10n, userId: 'user-1', role: 'operario' });
    capabilitiesService = { getCapabilities: vi.fn() } as unknown as TenantCapabilitiesService;
    service = new CoreMesProductionService(capabilitiesService);
  });

  it('rejects work block if times overlap with an existing block for the same operator', async () => {
    // Mock the overlap check to return a row (meaning overlap exists)
    const mockedClient = {
      query: vi.fn().mockImplementation((queryStr: string) => {
        if (queryStr.includes('OVERLAPS')) {
          return Promise.resolve({ rows: [{ exists: 1 }] });
        }
        if (queryStr.includes('FOR UPDATE')) {
          return Promise.resolve({ rows: [{ id: 'order-1', status: 'in_progress', workstation_id: 'ws-1' }] });
        }
        return Promise.resolve({ rows: [] });
      })
    };

    const dto = {
      id: 'event-1',
      tenant_id: 10n,
      order_id: 'order-1',
      workstation_id: 'ws-1',
      operator_id: 'user-1',
      type: 'produccion' as const,
      start_time: '2026-06-14T08:00:00Z',
      end_time: '2026-06-14T10:00:00Z',
      produced_quantity: 100,
      is_offline_event: false,
      client_device_id: null,
    };

    const { withTenantTransaction } = await import('../db/withTenantTransaction.js');
    (withTenantTransaction as any).mockImplementation(async (cb: any) => cb(mockedClient));

    await expect(service.syncWorkBlock(dto)).rejects.toThrow(BadRequestException);
    await expect(service.syncWorkBlock(dto)).rejects.toThrow('El bloque de tiempo se solapa con otro registro existente para este operario.');
  });

  it('uses authenticated tenant context regardless of offline event tenant_id', async () => {
    const mockedClient = {
      query: vi.fn().mockImplementation((queryStr: string) => {
        if (queryStr.includes('FOR UPDATE')) {
          return Promise.resolve({ rows: [{ id: 'order-1', status: 'pending', workstation_id: 'ws-1' }] });
        }
        if (queryStr.includes('OVERLAPS')) {
          return Promise.resolve({ rows: [] });
        }
        if (queryStr.includes('INSERT INTO production_work_blocks')) {
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'event-2' }] });
        }
        if (queryStr.includes('UPDATE orders')) {
          return Promise.resolve({ rows: [{ id: 'order-1', code: 'ORD-1', quantity: 100, produced_quantity: 50, defect_quantity: 0, status: 'in_progress', workstation_id: 'ws-1', custom_fields: {}, created_at: new Date(), updated_at: new Date() }] });
        }
        return Promise.resolve({ rows: [] });
      })
    };
    vi.mocked(await import('../db/withTenantTransaction.js')).withTenantTransaction.mockImplementation(async (cb: any) => cb(mockedClient));

    const dto = {
      id: 'event-2',
      tenant_id: 99n,
      order_id: 'order-1',
      workstation_id: 'ws-1',
      operator_id: 'user-1',
      type: 'produccion' as const,
      start_time: '2026-06-14T08:00:00Z',
      end_time: '2026-06-14T10:00:00Z',
      produced_quantity: 50,
      is_offline_event: true,
      client_device_id: 'sincro-offline-01',
    };

    const result = await service.syncWorkBlock(dto);
    expect(result.synced).toBe(true);

    const lockOrderCall = mockedClient.query.mock.calls.find(c => (c[0] as string).includes('FOR UPDATE'));
    expect(lockOrderCall).toBeDefined();
    const overlapCall = mockedClient.query.mock.calls.find(c => (c[0] as string).includes('OVERLAPS'));
    expect(overlapCall?.[1]).toContain('10');
  });
});

describe('CoreMesProductionService - listMyTimeLogs (2.2 Mi turno hoy)', () => {
  let service: CoreMesProductionService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 10n, userId: 'operator-uuid', role: 'operario' });
    service = new CoreMesProductionService({ getCapabilities: vi.fn() } as unknown as TenantCapabilitiesService);
  });

  it('filtra por tenant y por el operario del token, nunca por parámetro externo', async () => {
    vi.mocked(postgresPool.query).mockResolvedValue({ rows: [] } as any);

    await service.listMyTimeLogs({
      from: '2026-09-22T00:00:00.000Z',
      to: '2026-09-23T00:00:00.000Z',
    });

    const [sql, params] = vi.mocked(postgresPool.query).mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain('operator_id = $2::uuid');
    expect(params[0]).toBe('10');
    expect(params[1]).toBe('operator-uuid');
    expect(params[2]).toBe('2026-09-22T00:00:00.000Z');
    expect(params[3]).toBe('2026-09-23T00:00:00.000Z');
  });

  it('devuelve los bloques ordenados por hora de inicio', async () => {
    const rows = [
      { id: 'b1', type: 'produccion', start_time: '2026-09-22T08:00:00.000Z', produced_quantity: 100, defect_quantity: 2 },
      { id: 'b2', type: 'parada', start_time: '2026-09-22T10:00:00.000Z' },
    ];
    vi.mocked(postgresPool.query).mockResolvedValue({ rows } as any);

    const result = await service.listMyTimeLogs({
      from: '2026-09-22T00:00:00.000Z',
      to: '2026-09-23T00:00:00.000Z',
    });

    expect(result).toEqual(rows);
    const [sql] = vi.mocked(postgresPool.query).mock.calls[0] as unknown as [string];
    expect(sql).toContain('ORDER BY start_time ASC');
  });
});
