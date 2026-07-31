import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IncidenciasService } from './incidencias.service.js';

describe('IncidenciasService', () => {
  let service: IncidenciasService;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn();
    const mockPool = { query: mockQuery } as any;
    service = new IncidenciasService(mockPool);
  });

  it('list returns incidencias for the tenant', async () => {
    const mockRows = [{ id: 'i1', title: 'Incidencia A', status: 'abierta' }];
    mockQuery.mockResolvedValue({ rows: mockRows });
    const result = await service.list(1n);
    expect(result).toEqual(mockRows);
  });

  it('getById returns null when incidencia not found', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    const result = await service.getById(1n, 'non-existent');
    expect(result).toBeNull();
  });
});
