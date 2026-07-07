import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CostService } from './cost.service.js';
import { postgresPool } from '../db/postgres.provider.js';
import * as tenantContext from '../auth/tenant-context.storage.js';

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

describe('CostService', () => {
  let service: CostService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'admin-1',
      role: 'tenant_admin',
    });
    service = new CostService();
  });

  it('createEntry inserts and returns a cost entry', async () => {
    (postgresPool.query as any).mockResolvedValue({
      rows: [{
        id: 'ce-1',
        order_id: 'order-1',
        category: 'material',
        amount: 1500.50,
        currency: 'USD',
        description: 'Acero inoxidable',
        created_at: '2026-07-04T10:00:00Z',
      }],
    });

    const result = await service.createEntry('order-1', 'material', 1500.50, 'USD', 'Acero inoxidable');
    expect(result.category).toBe('material');
    expect(result.amount).toBe(1500.50);
  });

  it('getSummary calculates totals by category', async () => {
    (postgresPool.query as any).mockResolvedValue({
      rows: [{
        total_material: 5000,
        total_labor: 3000,
        total_overhead: 1000,
        total_energy: 500,
        total_cost: 9500,
        currency: 'USD',
      }],
    });

    const result = await service.getSummary('order-1');
    expect(result.total_cost).toBe(9500);
    expect(result.currency).toBe('USD');
  });
});
