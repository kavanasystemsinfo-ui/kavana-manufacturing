import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IncidenciasService } from './incidencias.service.js';
import { tenantQuery } from '../db/tenant-query.js';

vi.mock('../db/tenant-query.js', () => ({
  tenantQuery: vi.fn(),
}));

describe('IncidenciasService', () => {
  let service: IncidenciasService;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn();
    (tenantQuery as any).mockImplementation(
      (_pool: any, _text: string, params?: unknown[]) =>
        Promise.resolve({ rows: [], rowCount: 0 })
    );
    service = new IncidenciasService();
  });

  it('list returns incidencias for the tenant', async () => {
    const mockRows = [{ id: 'i1', title: 'Incidencia A', status: 'abierta' }];
    (tenantQuery as any).mockResolvedValue({ rows: mockRows });
    const result = await service.list(1n);
    expect(result).toEqual(mockRows);
  });

  it('getById returns null when incidencia not found', async () => {
    (tenantQuery as any).mockResolvedValue({ rowCount: 0, rows: [] });
    const result = await service.getById(1n, 'non-existent');
    expect(result).toBeNull();
  });
});
