import { BadRequestException, Injectable } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import { IncidenciaUploadsService } from './incidencia-uploads.service.js';

@Injectable()
export class IncidenciasService {
  constructor(private readonly uploads: IncidenciaUploadsService) {}
  async list(tenantId: bigint) {
    const res = await tenantQuery(
      postgresPool,
      `SELECT i.*,
              CASE WHEN i.photo IS NOT NULL THEN encode(i.photo, 'base64') ELSE NULL END AS photo_b64
       FROM incidencias i WHERE i.tenant_id = $1 ORDER BY i.created_at DESC`,
      [tenantId]
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async getById(tenantId: bigint, id: string) {
    const res = await tenantQuery(
      postgresPool,
      `SELECT i.*,
              CASE WHEN i.photo IS NOT NULL THEN encode(i.photo, 'base64') ELSE NULL END AS photo_b64
       FROM incidencias i WHERE i.tenant_id = $1 AND i.id = $2`,
      [tenantId, id]
    );
    return res.rows[0] ? this.mapRow(res.rows[0]) : null;
  }

  /** Quita los bytes crudos y expone la foto como data URL para el frontend. */
  private mapRow(row: any) {
    const { photo, photo_b64, ...rest } = row;
    return {
      ...rest,
      photo_data_url: photo_b64
        ? `data:${row.photo_mime ?? 'image/png'};base64,${photo_b64}`
        : null,
    };
  }

  async create(tenantId: bigint, data: {
    workstation_id?: string;
    order_id?: string;
    reported_by: string;
    type: string;
    title: string;
    description?: string;
    assigned_to?: string;
    photo_session_id?: string;
  }) {
    // Si la incidencia lleva evidencia fotográfica, la sesión debe existir, ser
    // del tenant y tener la foto ya subida. Se marca 'used' tras crear la fila.
    if (data.photo_session_id) {
      const session = await this.uploads.getSession(tenantId, data.photo_session_id);
      if (!session) {
        throw new BadRequestException('Sesión de foto no encontrada para este tenant');
      }
      if (session.status !== 'uploaded') {
        throw new BadRequestException('La foto no se ha subido todavía. Escanea el QR y adjunta la imagen.');
      }
    }

    const res = await tenantQuery(
      postgresPool,
      `INSERT INTO incidencias (tenant_id, workstation_id, order_id, reported_by, type, title, description, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [tenantId, data.workstation_id || null, data.order_id || null, data.reported_by, data.type, data.title, data.description || null, data.assigned_to || null]
    );
    const incidencia = res.rows[0];

    if (data.photo_session_id) {
      const finalized = await this.uploads.finalize(tenantId, data.photo_session_id, incidencia.id);
      if (!finalized) {
        throw new BadRequestException('No se pudo adjuntar la foto a la incidencia');
      }
      // finalize copió la foto a la fila: recargar para devolver photo_data_url.
      return this.getById(tenantId, incidencia.id);
    }
    return this.mapRow(incidencia);
  }

  async update(tenantId: bigint, id: string, data: {
    workstation_id?: string;
    order_id?: string;
    type?: string;
    title?: string;
    description?: string;
    status?: string;
    assigned_to?: string;
    resolved_at?: string;
  }) {
    const fields: string[] = [];
    const values: unknown[] = [tenantId, id];
    let idx = 3;

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (fields.length === 0) return this.getById(tenantId, id);

    fields.push('updated_at = NOW()');
    const res = await tenantQuery(
      postgresPool,
      `UPDATE incidencias SET ${fields.join(', ')} WHERE tenant_id = $1 AND id = $2 RETURNING *`,
      values
    );
    return res.rows[0] || null;
  }

  async delete(tenantId: bigint, id: string) {
    // Las sesiones de subida referencian la incidencia con una FK
    // ON DELETE SET NULL sobre (tenant_id, incidencia_id), pero tenant_id es
    // NOT NULL en incidencia_uploads: el SET NULL viola la constraint y el
    // DELETE de una incidencia con foto revienta con 500. La foto ya está
    // copiada en incidencias.photo, así que la sesión es metadata y se borra
    // antes que la incidencia.
    await tenantQuery(
      postgresPool,
      'DELETE FROM incidencia_uploads WHERE tenant_id = $1 AND incidencia_id = $2',
      [tenantId, id]
    );
    await tenantQuery(
      postgresPool,
      'DELETE FROM incidencias WHERE tenant_id = $1 AND id = $2',
      [tenantId, id]
    );
  }

  async getStats(tenantId: bigint) {
    const res = await tenantQuery(
      postgresPool,
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'abierto') as abiertas,
        COUNT(*) FILTER (WHERE status = 'en_progreso') as en_progreso,
        COUNT(*) FILTER (WHERE status = 'resuelto') as resueltas,
        COUNT(*) FILTER (WHERE status = 'cerrado') as cerradas
       FROM incidencias WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows[0];
  }
}
