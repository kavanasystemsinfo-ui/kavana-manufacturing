import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OeeService } from './oee.service.js';
import { postgresPool } from '../db/postgres.provider.js';
import * as tenantContext from '../auth/tenant-context.storage.js';

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

describe('OeeService', () => {
  let service: OeeService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'admin-1',
      role: 'tenant_admin',
    });
    service = new OeeService();
  });

  describe('getOeeSummary', () => {
    it('calculates OEE correctly for production blocks', async () => {
      // Mock workstation query
      (postgresPool.query as any)
        .mockResolvedValueOnce({ rows: [{ name: 'Línea 1' }] })
        // Mock production blocks
        .mockResolvedValueOnce({
          rows: [
            {
              type: 'produccion',
              start_time: '2026-07-04T08:00:00Z',
              end_time: '2026-07-04T12:00:00Z', // 4 hours = 14400000ms
              produced_quantity: 800,
              defect_quantity: 20,
              downtime_reason: null,
            },
          ],
        })
        // Mock model query for target rate
        .mockResolvedValueOnce({ rows: [{ target_rate: 250 }] });

      const result = await service.getOeeSummary(
        'ws-1',
        '2026-07-04T00:00:00Z',
        '2026-07-04T23:59:59Z',
      );

      expect(result.workstation_name).toBe('Línea 1');
      expect(result.total_produced).toBe(800);
      expect(result.total_defects).toBe(20);
      expect(result.availability).toBe(100); // Only production, no downtime
      expect(result.quality).toBe(97.5); // (800-20)/800 = 97.5%
    });

    it('returns zero OEE when no blocks exist', async () => {
      (postgresPool.query as any)
        .mockResolvedValueOnce({ rows: [{ name: 'Línea 2' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getOeeSummary(
        'ws-2',
        '2026-07-04T00:00:00Z',
        '2026-07-04T23:59:59Z',
      );

      expect(result.oee).toBe(0);
      expect(result.total_produced).toBe(0);
    });

    it('reduces availability when downtime exists', async () => {
      (postgresPool.query as any)
        .mockResolvedValueOnce({ rows: [{ name: 'Línea 3' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              type: 'produccion',
              start_time: '2026-07-04T08:00:00Z',
              end_time: '2026-07-04T10:00:00Z', // 2 hours production
              produced_quantity: 400,
              defect_quantity: 0,
              downtime_reason: null,
            },
            {
              type: 'parada',
              start_time: '2026-07-04T10:00:00Z',
              end_time: '2026-07-04T12:00:00Z', // 2 hours downtime
              produced_quantity: null,
              defect_quantity: null,
              downtime_reason: 'Mantenimiento',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ target_rate: 200 }] });

      const result = await service.getOeeSummary(
        'ws-3',
        '2026-07-04T00:00:00Z',
        '2026-07-04T23:59:59Z',
      );

      expect(result.availability).toBe(50); // 2h production / 4h total
      expect(result.total_downtime_ms).toBe(7200000); // 2 hours
    });
  });

  describe('getOeeByWorkstation', () => {
    it('returns OEE for all active workstations', async () => {
      (postgresPool.query as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 'ws-1', name: 'Línea 1' },
            { id: 'ws-2', name: 'Línea 2' },
          ],
        })
        // ws-1 calls
        .mockResolvedValueOnce({ rows: [{ name: 'Línea 1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        // ws-2 calls
        .mockResolvedValueOnce({ rows: [{ name: 'Línea 2' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getOeeByWorkstation(
        '2026-07-04T00:00:00Z',
        '2026-07-04T23:59:59Z',
      );

      expect(result).toHaveLength(2);
      expect(result[0].workstation_name).toBe('Línea 1');
      expect(result[1].workstation_name).toBe('Línea 2');
    });
  });

  describe('getDowntimeBreakdown', () => {
    it('returns downtime reasons sorted by total time', async () => {
      (postgresPool.query as any).mockResolvedValue({
        rows: [
          { downtime_reason: 'Mantenimiento', count: 3, total_ms: 10800000 },
          { downtime_reason: 'Falla técnica', count: 1, total_ms: 3600000 },
        ],
      });

      const result = await service.getDowntimeBreakdown(
        'ws-1',
        '2026-07-04T00:00:00Z',
        '2026-07-04T23:59:59Z',
      );

      expect(result).toHaveLength(2);
      expect(result[0].reason).toBe('Mantenimiento');
      expect(result[0].percentage).toBe(75); // 10800000 / 14400000
      expect(result[1].reason).toBe('Falla técnica');
      expect(result[1].percentage).toBe(25);
    });

    it('returns empty array when no downtime exists', async () => {
      (postgresPool.query as any).mockResolvedValue({ rows: [] });

      const result = await service.getDowntimeBreakdown(
        'ws-1',
        '2026-07-04T00:00:00Z',
        '2026-07-04T23:59:59Z',
      );

      expect(result).toHaveLength(0);
    });
  });
});
