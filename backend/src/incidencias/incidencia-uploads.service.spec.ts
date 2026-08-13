import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IncidenciaUploadsService } from './incidencia-uploads.service.js';
import { tenantQuery } from '../db/tenant-query.js';
import { postgresPool } from '../db/postgres.provider.js';
import { MAX_PHOTO_BYTES } from './photo-validator.js';

vi.mock('../db/tenant-query.js', () => ({
  tenantQuery: vi.fn(),
}));

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { connect: vi.fn() },
}));

// PNG 1x1 transparente real (base64)
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const TENANT = 1n;
const USER_ID = '00000000-0000-0000-0000-000000000001';

function makeQueryMock(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (text: string, params?: unknown[]) => {
    if (String(text).includes('get_incidencia_upload_session')) {
      return {
        rows: [
          {
            tenant_id: '1',
            status: 'pending',
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            ...(overrides.session ?? {}),
          },
        ],
      };
    }
    if (String(text).includes('UPDATE incidencia_uploads SET status')) {
      return { rowCount: 1, rows: [{ session_id: 's-1' }] };
    }
    return { rows: [], rowCount: 0 };
  });
}

describe('IncidenciaUploadsService', () => {
  let service: IncidenciaUploadsService;
  let mockTenantQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockTenantQuery = vi.fn();
    (tenantQuery as any).mockImplementation(() => Promise.resolve({ rows: [], rowCount: 0 }));
    (postgresPool.connect as any).mockResolvedValue({ query: makeQueryMock(), release: vi.fn() });
    service = new IncidenciaUploadsService();
  });

  describe('createSession', () => {
    it('crea una sesión pending con caducidad', async () => {
      (tenantQuery as any).mockResolvedValue({
        rows: [{ session_id: 'abc-123', expires_at: new Date(Date.now() + 15 * 60_000).toISOString() }],
      });
      const session = await service.createSession(TENANT, USER_ID);
      expect(session.session_id).toBe('abc-123');
      expect(session.status).toBe('pending');
      expect(session.has_photo).toBe(false);
      expect(mockTenantQuery).not.toHaveBeenCalled();
    });
  });

  describe('attachPhoto', () => {
    it('acepta un PNG real y lo persiste con su mime', async () => {
      const result = await service.attachPhoto('sess-1', PNG_1PX);
      expect(result).toEqual({ ok: true, mime: 'image/png', size: PNG_1PX.length });
    });

    it('rechaza con 404 si la sesión no existe', async () => {
      (postgresPool.connect as any).mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      });
      await expect(service.attachPhoto('sess-unknown', PNG_1PX)).rejects.toThrow('no encontrada');
    });

    it('rechaza con 409 si la sesión ya tiene foto o está usada', async () => {
      (postgresPool.connect as any).mockResolvedValue({
        query: makeQueryMock({
          session: { tenant_id: '1', status: 'uploaded', expires_at: new Date(Date.now() + 60_000).toISOString() },
        }),
        release: vi.fn(),
      });
      await expect(service.attachPhoto('sess-1', PNG_1PX)).rejects.toThrow('ya no está pendiente');
    });

    it('rechaza con 410 si la sesión caducó', async () => {
      (postgresPool.connect as any).mockResolvedValue({
        query: makeQueryMock({
          session: { tenant_id: '1', status: 'pending', expires_at: new Date(Date.now() - 1000).toISOString() },
        }),
        release: vi.fn(),
      });
      await expect(service.attachPhoto('sess-1', PNG_1PX)).rejects.toThrow('caducado');
    });

    it('rechaza con 400 si el archivo no es una imagen', async () => {
      await expect(service.attachPhoto('sess-1', Buffer.from('hola, soy un txt'))).rejects.toThrow(
        'Solo se permiten imágenes'
      );
    });

    it('rechaza con 400 si supera el tamaño máximo', async () => {
      const big = Buffer.concat([PNG_1PX, Buffer.alloc(MAX_PHOTO_BYTES)]);
      await expect(service.attachPhoto('sess-1', big)).rejects.toThrow('tamaño máximo');
    });

    it('libera el cliente del pool siempre (también en error)', async () => {
      const release = vi.fn();
      (postgresPool.connect as any).mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release,
      });
      await expect(service.attachPhoto('sess-unknown', PNG_1PX)).rejects.toThrow();
      expect(release).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('devuelve la sesión del tenant con has_photo y data URL', async () => {
      (tenantQuery as any).mockResolvedValue({
        rows: [{
          session_id: 's-1', status: 'uploaded', expires_at: '2026-08-11T10:00:00Z',
          has_photo: true, incidencia_id: null,
          photo_b64: PNG_1PX.toString('base64'), photo_mime: 'image/png',
        }],
      });
      const session = await service.getSession(TENANT, 's-1');
      expect(session?.status).toBe('uploaded');
      expect(session?.has_photo).toBe(true);
      expect(session?.photo_data_url).toContain('data:image/png;base64,');
    });

    it('no incluye data URL si la sesión está pendiente sin foto', async () => {
      (tenantQuery as any).mockResolvedValue({
        rows: [{
          session_id: 's-2', status: 'pending', expires_at: '2026-08-11T10:00:00Z',
          has_photo: false, incidencia_id: null,
          photo_b64: null, photo_mime: null,
        }],
      });
      const session = await service.getSession(TENANT, 's-2');
      expect(session?.has_photo).toBe(false);
      expect(session?.photo_data_url).toBeNull();
    });

    it('devuelve null si no existe en el tenant', async () => {
      (tenantQuery as any).mockResolvedValue({ rows: [] });
      expect(await service.getSession(TENANT, 'no-existe')).toBeNull();
    });
  });

  describe('getPhoto', () => {
    it('devuelve buffer y mime', async () => {
      (tenantQuery as any).mockResolvedValue({ rows: [{ photo: PNG_1PX, photo_mime: 'image/png' }] });
      const photo = await service.getPhoto(TENANT, 's-1');
      expect(photo?.mime).toBe('image/png');
      expect(photo?.buffer.length).toBe(PNG_1PX.length);
    });

    it('devuelve null si no hay foto', async () => {
      (tenantQuery as any).mockResolvedValue({ rows: [] });
      expect(await service.getPhoto(TENANT, 's-1')).toBeNull();
    });
  });

  describe('finalize', () => {
    it('copia la foto a la incidencia y marca la sesión como usada', async () => {
      (tenantQuery as any).mockResolvedValue({ rowCount: 1, rows: [] });
      expect(await service.finalize(TENANT, 's-1', 'inc-1')).toBe(true);
    });

    it('devuelve false si la sesión no estaba uploaded o no es del tenant', async () => {
      (tenantQuery as any).mockResolvedValue({ rowCount: 0, rows: [] });
      expect(await service.finalize(TENANT, 's-1', 'inc-1')).toBe(false);
    });
  });
});
