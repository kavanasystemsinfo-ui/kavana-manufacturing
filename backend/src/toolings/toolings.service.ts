import { Injectable, ForbiddenException } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import type { z } from 'zod';
import type { createToolingSchema, updateToolingSchema } from './dto.js';

type CreateToolingInput = z.infer<typeof createToolingSchema>;
type UpdateToolingInput = z.infer<typeof updateToolingSchema>;

@Injectable()
export class ToolingsService {
  async list(tenantId: bigint) {
    const result = await tenantQuery(postgresPool,
      `SELECT id, code, name, type, location, status, current_cycles, max_cycles, warning_pct,
              cycles_per_piece, estimated_pieces, notes, created_at, updated_at
       FROM toolings WHERE tenant_id = get_current_tenant() ORDER BY created_at DESC`);
    return result.rows;
  }

  async getById(tenantId: bigint, id: string) {
    const result = await tenantQuery(postgresPool,
      `SELECT * FROM toolings WHERE tenant_id = get_current_tenant() AND id = $1::uuid`, [id]);
    if (result.rowCount === 0) return null;
    return result.rows[0];
  }

  async create(tenantId: bigint, data: CreateToolingInput) {
    const result = await tenantQuery(postgresPool,
      `INSERT INTO toolings (tenant_id, code, name, type, location, current_cycles, max_cycles, warning_pct, cycles_per_piece, notes)
       VALUES (get_current_tenant(), $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::int, $6::int, $7::int, $8::numeric, $9::text)
       RETURNING *`,
      [data.code, data.name, data.type || 'troquel', data.location || null, data.current_cycles || 0, data.max_cycles || 100000, data.warning_pct || 80, data.cycles_per_piece || 0, data.notes || null]);
    return result.rows[0];
  }

  async update(tenantId: bigint, id: string, data: UpdateToolingInput) {
    const fields: string[] = [];
    const values: (string | number | undefined)[] = [];
    let paramIdx = 1;

    const numericFields = ['current_cycles', 'max_cycles', 'warning_pct', 'cycles_per_piece'];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && ['code', 'name', 'type', 'location', 'status', 'current_cycles', 'max_cycles', 'warning_pct', 'cycles_per_piece', 'notes'].includes(key)) {
        const type = numericFields.includes(key) ? 'numeric' : 'varchar';
        fields.push(`${key} = $${paramIdx}::${type}`);
        values.push(value);
        paramIdx++;
      }
    }

    if (fields.length === 0) throw new ForbiddenException('No valid fields to update.');

    values.push(id, tenantId.toString());
    const result = await tenantQuery(postgresPool,
      `UPDATE toolings SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx}::uuid AND tenant_id = get_current_tenant() RETURNING *`,
      values);
    if (result.rowCount === 0) throw new ForbiddenException('Tooling not found.');
    return result.rows[0];
  }

  async delete(tenantId: bigint, id: string) {
    const result = await tenantQuery(postgresPool,
      `DELETE FROM toolings WHERE tenant_id = get_current_tenant() AND id = $1::uuid`, [id]);
    if (result.rowCount === 0) throw new ForbiddenException('Tooling not found.');
  }

  async getAlerts(tenantId: bigint) {
    const result = await tenantQuery(postgresPool,
      `SELECT id, code, name, type, current_cycles, max_cycles,
              ROUND((current_cycles::float / max_cycles * 100)::numeric, 1) as usage_pct
       FROM toolings WHERE tenant_id = get_current_tenant() AND status = 'activo'
       AND (current_cycles::float / max_cycles * 100) >= warning_pct
       ORDER BY usage_pct DESC`);
    return result.rows;
  }

  async incrementCycles(tenantId: bigint, id: string, amount: number) {
    const result = await tenantQuery(postgresPool,
      `UPDATE toolings SET current_cycles = current_cycles + $1::numeric, updated_at = NOW()
       WHERE tenant_id = get_current_tenant() AND id = $2::uuid
       RETURNING *`, [amount, id]);
    if (result.rowCount === 0) throw new ForbiddenException('Tooling not found.');
    return result.rows[0];
  }

  async incrementByPieces(tenantId: bigint, id: string, pieces: number) {
    const result = await tenantQuery(postgresPool,
      `UPDATE toolings
       SET current_cycles = current_cycles + (cycles_per_piece * $1::numeric),
           estimated_pieces = estimated_pieces + $1::int,
           updated_at = NOW()
       WHERE tenant_id = get_current_tenant() AND id = $2::uuid AND cycles_per_piece > 0
       RETURNING *`, [pieces, id]);
    if (result.rowCount === 0) throw new ForbiddenException('Tooling not found or no cycles_per_piece configured.');
    return result.rows[0];
  }

  async getByWorkstation(tenantId: bigint, workstationId: string) {
    const result = await tenantQuery(postgresPool,
      `SELECT t.* FROM toolings t
       JOIN workstations w ON w.tooling_id = t.id
       WHERE w.tenant_id = get_current_tenant() AND w.id = $1::uuid`, [workstationId]);
    if (result.rowCount === 0) return null;
    return result.rows[0];
  }
}
