import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IncidenciasService } from './incidencias.service.js';
import { IncidenciaUploadsService } from './incidencia-uploads.service.js';
import { tenantQuery } from '../db/tenant-query.js';

vi.mock('../db/tenant-query.js', () => ({
  tenantQuery: vi.fn(),
}));

vi.mock('./incidencia-uploads.service.js', () => ({
  IncidenciaUploadsService: vi.fn().mockImplementation(() => ({
    getSession: vi.fn(),
    finalize: vi.fn(),
  })),
}));

describe('IncidenciasService', () => {
  let service: IncidenciasService;
  let mockQuery: any;
  let mockUploads: IncidenciaUploadsService;

  beforeEach(() => {
    mockQuery = vi.fn();
    (tenantQuery as any).mockImplementation(
      (_pool: any, _text: string, params?: unknown[]) =>
        Promise.resolve({ rows: [], rowCount: 0 })
    );
    (tenantQuery as any).mockClear();
    mockUploads = new IncidenciaUploadsService();
    service = new IncidenciasService(mockUploads);
  });

  it('list returns incidencias for the tenant con photo_data_url (null sin foto)', async () => {
    const mockRows = [{ id: 'i1', title: 'Incidencia A', status: 'abierta', photo_b64: null, photo_mime: null }];
    (tenantQuery as any).mockResolvedValue({ rows: mockRows });
    const result = await service.list(1n);
    expect(result[0]).toMatchObject({ id: 'i1', title: 'Incidencia A', photo_data_url: null });
  });

  it('list expone la foto como data URL cuando existe', async () => {
    const mockRows = [{
      id: 'i2', title: 'Con foto', status: 'abierta',
      photo_b64: Buffer.from('x').toString('base64'), photo_mime: 'image/png',
    }];
    (tenantQuery as any).mockResolvedValue({ rows: mockRows });
    const result = await service.list(1n);
    expect(result[0].photo_data_url).toContain('data:image/png;base64,');
    expect(result[0].photo_b64).toBeUndefined();
  });

  it('getById returns null when incidencia not found', async () => {
    (tenantQuery as any).mockResolvedValue({ rowCount: 0, rows: [] });
    const result = await service.getById(1n, 'non-existent');
    expect(result).toBeNull();
  });

  describe('create con photo_session_id', () => {
    const base = {
      reported_by: '00000000-0000-0000-0000-000000000001',
      type: 'produccion',
      severity: 'media',
      title: 'Avería en la sierra',
    };

    it('lanza error si la sesión de foto no existe en el tenant', async () => {
      (mockUploads.getSession as any).mockResolvedValue(null);
      await expect(
        service.create(1n, { ...base, photo_session_id: '00000000-0000-0000-0000-0000000000aa' })
      ).rejects.toThrow('Sesión de foto no encontrada');
      expect(tenantQuery).not.toHaveBeenCalled();
    });

    it('lanza error si la sesión no tiene la foto subida aún', async () => {
      (mockUploads.getSession as any).mockResolvedValue({ status: 'pending', has_photo: false });
      await expect(
        service.create(1n, { ...base, photo_session_id: '00000000-0000-0000-0000-0000000000aa' })
      ).rejects.toThrow('no se ha subido todavía');
    });

    it('crea la incidencia y adjunta la foto (finalize)', async () => {
      (mockUploads.getSession as any).mockResolvedValue({ status: 'uploaded', has_photo: true });
      (tenantQuery as any).mockResolvedValue({ rows: [{ id: 'inc-1', title: 'Avería' }] });
      (mockUploads.finalize as any).mockResolvedValue(true);
      const result = await service.create(1n, {
        ...base,
        photo_session_id: '00000000-0000-0000-0000-0000000000aa',
      });
      expect(result.id).toBe('inc-1');
      expect(mockUploads.finalize).toHaveBeenCalledWith(1n, '00000000-0000-0000-0000-0000000000aa', 'inc-1');
    });

    it('lanza error si finalize no encuentra la foto (sesión no uploaded)', async () => {
      (mockUploads.getSession as any).mockResolvedValue({ status: 'uploaded', has_photo: true });
      (tenantQuery as any).mockResolvedValue({ rows: [{ id: 'inc-1' }] });
      (mockUploads.finalize as any).mockResolvedValue(false);
      await expect(
        service.create(1n, { ...base, photo_session_id: '00000000-0000-0000-0000-0000000000aa' })
      ).rejects.toThrow('No se pudo adjuntar la foto');
    });

    it('no llama a finalize si no hay photo_session_id', async () => {
      (tenantQuery as any).mockResolvedValue({ rows: [{ id: 'inc-2' }] });
      await service.create(1n, base);
      expect(mockUploads.finalize).not.toHaveBeenCalled();
    });
  });
});
