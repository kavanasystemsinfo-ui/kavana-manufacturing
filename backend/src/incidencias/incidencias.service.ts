import { Injectable } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';

@Injectable()
export class IncidenciasService {
  async list(tenantId: bigint) {
    const res = await tenantQuery(
      postgresPool,
      'SELECT * FROM incidencias WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return res.rows;
  }

  async getById(tenantId: bigint, id: string) {
    const res = await tenantQuery(
      postgresPool,
      'SELECT * FROM incidencias WHERE tenant_id = $1 AND id = $2',
      [tenantId, id]
    );
    return res.rows[0] || null;
  }

  async create(tenantId: bigint, data: {
    workstation_id?: string;
    order_id?: string;
    reported_by: string;
    type: string;
    severity: string;
    title: string;
    description?: string;
    assigned_to?: string;
  }) {
    const res = await tenantQuery(
      postgresPool,
      `INSERT INTO incidencias (tenant_id, workstation_id, order_id, reported_by, type, severity, title, description, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tenantId, data.workstation_id || null, data.order_id || null, data.reported_by, data.type, data.severity, data.title, data.description || null, data.assigned_to || null]
    );
    return res.rows[0];
  }

  async update(tenantId: bigint, id: string, data: {
    workstation_id?: string;
    order_id?: string;
    type?: string;
    severity?: string;
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
        COUNT(*) FILTER (WHERE status = 'cerrado') as cerradas,
        COUNT(*) FILTER (WHERE severity = 'critica') as criticas,
        COUNT(*) FILTER (WHERE severity = 'alta') as altas
       FROM incidencias WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows[0];
  }
}
