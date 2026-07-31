import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToolingsService } from './toolings.service.js';
import { postgresPool } from '../db/postgres.provider.js';
import * as tenantQueryModule from '../db/tenant-query.js';

vi.mock('../db/tenant-query.js', () => ({
  tenantQuery: vi.fn(),
}));

describe('ToolingsService', () => {
  let service: ToolingsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ToolingsService();
  });

  it('list returns toolings for the tenant', async () => {
    const mockRows = [{ id: 't1', code: 'TR-001', name: 'Troquel A', type: 'troquel' }];
    (tenantQueryModule.tenantQuery as any).mockResolvedValue({ rows: mockRows });
    const result = await service.list(1n);
    expect(result).toEqual(mockRows);
  });

  it('getById returns null when tooling not found', async () => {
    (tenantQueryModule.tenantQuery as any).mockResolvedValue({ rowCount: 0, rows: [] });
    const result = await service.getById(1n, 'non-existent');
    expect(result).toBeNull();
  });

  it('getById returns tooling when found', async () => {
    const mockTooling = { id: 't1', code: 'TR-001', name: 'Troquel A' };
    (tenantQueryModule.tenantQuery as any).mockResolvedValue({ rowCount: 1, rows: [mockTooling] });
    const result = await service.getById(1n, 't1');
    expect(result).toEqual(mockTooling);
  });
});
