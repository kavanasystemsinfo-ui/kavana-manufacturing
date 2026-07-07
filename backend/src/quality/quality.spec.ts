import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QualityService } from './quality.service.js';
import { postgresPool } from '../db/postgres.provider.js';
import * as tenantContext from '../auth/tenant-context.storage.js';

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

describe('QualityService', () => {
  let service: QualityService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'inspector-1',
      role: 'supervisor',
    });
    service = new QualityService();
  });

  it('createCheck inserts and returns a quality check', async () => {
    (postgresPool.query as any).mockResolvedValue({
      rows: [{
        id: 'qc-1',
        order_id: 'order-1',
        workstation_id: 'ws-1',
        inspector_id: 'inspector-1',
        result: 'pass',
        defect_count: 0,
        defect_type: null,
        notes: null,
        checked_at: '2026-07-04T10:00:00Z',
      }],
    });

    const result = await service.createCheck('order-1', 'ws-1', 'pass', 0);
    expect(result.result).toBe('pass');
    expect(result.inspector_id).toBe('inspector-1');
  });

  it('getSummary calculates pass rate correctly', async () => {
    (postgresPool.query as any).mockResolvedValue({
      rows: [{
        total_checks: 10,
        passed: 8,
        failed: 1,
        conditional: 1,
        total_defects: 3,
      }],
    });

    const result = await service.getSummary('order-1');
    expect(result.pass_rate).toBe(80);
    expect(result.total_defects).toBe(3);
  });
});
