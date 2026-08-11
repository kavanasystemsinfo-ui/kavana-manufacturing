import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import { validatePhoto } from './photo-validator.js';

// TTL de una sesión de subida: tiempo que tiene el operario para escanear el QR
// y subir la foto desde el móvil antes de que caduque.
const SESSION_TTL_MINUTES = 15;

export interface UploadSession {
  session_id: string;
  status: 'pending' | 'uploaded' | 'used' | 'expired';
  expires_at: string;
  has_photo: boolean;
  incidencia_id: string | null;
  /** data URL de la foto (solo cuando has_photo). El polling lo recibe una sola
   *  vez: el modal deja de consultar en cuanto la ve. */
  photo_data_url?: string | null;
}

/**
 * Sesiones de subida de fotos de incidencias (flujo QR + móvil).
 *
 * Seguridad (mejores prácticas sobre el original):
 * - El session_id (uuid v4) es la credencial de la subida pública; sin endpoint
 *   abierto tipo "sube lo que quieras": caduca, acepta UNA foto y valida magic
 *   bytes + tamaño.
 * - La subida pública resuelve el tenant desde la propia sesión vía función
 *   SECURITY DEFINER (get_incidencia_upload_session) y fija app.current_tenant_id
 *   antes del UPDATE: un móvil anónimo no puede tocar sesiones de otros tenants.
 * - El panel (autenticado) solo ve sesiones de SU tenant (tenantQuery + RLS).
 */
@Injectable()
export class IncidenciaUploadsService {
  /** Crea una sesión para el operario (requiere auth). Caduca en 15 minutos. */
  async createSession(tenantId: bigint, userId: string): Promise<UploadSession> {
    // Limpieza lazy: expira sesiones pendientes vencidas antes de crear una nueva.
    await tenantQuery(
      postgresPool,
      `UPDATE incidencia_uploads SET status = 'expired'
       WHERE tenant_id = $1 AND status = 'pending' AND expires_at < NOW()`,
      [tenantId]
    );

    const res = await tenantQuery(
      postgresPool,
      `INSERT INTO incidencia_uploads (tenant_id, session_id, created_by, status, expires_at)
       VALUES ($1, gen_random_uuid(), $2, 'pending', NOW() + ($3 || ' minutes')::interval)
       RETURNING session_id::text, expires_at`,
      [tenantId, userId, SESSION_TTL_MINUTES]
    );
    const row = res.rows[0];
    return {
      session_id: row.session_id,
      status: 'pending',
      expires_at: row.expires_at,
      has_photo: false,
      incidencia_id: null,
    };
  }

  /**
   * Subida pública desde el móvil: POST /incidencias/upload-mobile/:sessionId.
   * El sessionId es un token de un solo uso; este método NO confía en el
   * contexto del request (el móvil va sin token) sino en la propia sesión.
   */
  async attachPhoto(sessionId: string, buffer: Buffer) {
    const client = await postgresPool.connect();
    try {
      const found = await client.query(
        'SELECT tenant_id, status, expires_at FROM get_incidencia_upload_session($1)',
        [sessionId]
      );
      const session = found.rows[0];
      if (!session) {
        throw new NotFoundException('Sesión de subida no encontrada');
      }
      if (session.status !== 'pending') {
        throw new ConflictException('La sesión ya no está pendiente (foto subida o incidencia creada)');
      }
      if (new Date(session.expires_at).getTime() < Date.now()) {
        throw new GoneException('La sesión ha caducado. Vuelve a abrir el modal de incidencias.');
      }

      const validation = validatePhoto(buffer);
      if (!validation.ok) {
        throw new BadRequestException(validation.reason);
      }

      // Fijar el tenant DE LA SESIÓN (no el contexto demo del request público)
      // para que el UPDATE pase el RLS del tenant correcto.
      await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [
        session.tenant_id.toString(),
      ]);
      const upd = await client.query(
        `UPDATE incidencia_uploads SET status = 'uploaded', photo = $2, photo_mime = $3, photo_size = $4
         WHERE session_id = $1 AND status = 'pending' RETURNING session_id`,
        [sessionId, buffer, validation.mime, validation.size]
      );
      if (upd.rowCount === 0) {
        throw new ConflictException('La sesión ya no está pendiente');
      }
      return { ok: true, mime: validation.mime, size: validation.size };
    } finally {
      client.release();
    }
  }

  /** Estado de la sesión para el polling del modal (auth, tenant aislado).
   *  Incluye la foto como data URL cuando ya se subió (una sola vez). */
  async getSession(tenantId: bigint, sessionId: string): Promise<UploadSession | null> {
    const res = await tenantQuery(
      postgresPool,
      `SELECT session_id::text, status, expires_at,
              photo IS NOT NULL AS has_photo, incidencia_id::text,
              CASE WHEN photo IS NOT NULL THEN encode(photo, 'base64') ELSE NULL END AS photo_b64,
              photo_mime
       FROM incidencia_uploads
       WHERE tenant_id = $1 AND session_id = $2`,
      [tenantId, sessionId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      session_id: row.session_id,
      status: row.status,
      expires_at: row.expires_at,
      has_photo: row.has_photo,
      incidencia_id: row.incidencia_id,
      photo_data_url: row.photo_b64
        ? `data:${row.photo_mime};base64,${row.photo_b64}`
        : null,
    };
  }

  /** Bytes de la foto para el preview del modal (auth, tenant aislado). */
  async getPhoto(tenantId: bigint, sessionId: string): Promise<{ buffer: Buffer; mime: string } | null> {
    const res = await tenantQuery(
      postgresPool,
      `SELECT photo, photo_mime FROM incidencia_uploads
       WHERE tenant_id = $1 AND session_id = $2 AND photo IS NOT NULL`,
      [tenantId, sessionId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return { buffer: row.photo, mime: row.photo_mime };
  }

  /**
   * Finaliza la sesión al crear la incidencia: copia la foto a la incidencia
   * (la evidencia vive en incidencias) y marca la sesión como 'used' liberando
   * la foto temporal. Devuelve false si la sesión no estaba 'uploaded'.
   */
  async finalize(tenantId: bigint, sessionId: string, incidenciaId: string): Promise<boolean> {
    const copied = await tenantQuery(
      postgresPool,
      `UPDATE incidencias SET photo = u.photo, photo_mime = u.photo_mime, photo_size = u.photo_size
       FROM incidencia_uploads u
       WHERE incidencias.id = $3 AND incidencias.tenant_id = $1
         AND u.session_id = $2 AND u.tenant_id = $1 AND u.status = 'uploaded'`,
      [tenantId, sessionId, incidenciaId]
    );
    if ((copied.rowCount ?? 0) === 0) return false;
    await tenantQuery(
      postgresPool,
      `UPDATE incidencia_uploads SET status = 'used', incidencia_id = $3,
              photo = NULL, photo_mime = NULL, photo_size = NULL
       WHERE tenant_id = $1 AND session_id = $2 AND status = 'uploaded'`,
      [tenantId, sessionId, incidenciaId]
    );
    return true;
  }
}
