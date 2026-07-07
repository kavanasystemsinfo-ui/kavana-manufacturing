import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import type { CreateWorkstationDto, UpdateWorkstationDto } from './dto.js';

@Injectable()
export class WorkstationsService {
  async createWorkstation(dto: CreateWorkstationDto) {
    const code = dto.code ?? dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    try {
      const result = await tenantQuery(
        postgresPool,
        `INSERT INTO workstations (tenant_id, code, name, status)
         VALUES (get_current_tenant(), $1, $2, $3)
         RETURNING id, code, name, status, created_at, updated_at`,
        [code, dto.name, dto.status ?? 'active'],
      );
      return result.rows[0];
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create workstation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listWorkstations() {
    const result = await tenantQuery(
      postgresPool,
      `SELECT id, code, name, status, created_at, updated_at
       FROM workstations
       WHERE tenant_id = get_current_tenant()
       ORDER BY created_at DESC`,
    );
    return result.rows;
  }

  async getWorkstation(workstationId: string) {
    const result = await tenantQuery(
      postgresPool,
      `SELECT id, code, name, status, created_at, updated_at
       FROM workstations
       WHERE tenant_id = get_current_tenant() AND id = $1`,
      [workstationId],
    );
    return result.rows[0] ?? null;
  }

  async updateWorkstation(workstationId: string, dto: UpdateWorkstationDto) {
    const setClauses: string[] = [];
    const values: string[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      values.push(dto.name);
      paramIndex++;
    }
    if (dto.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(dto.status);
      paramIndex++;
    }
    if (setClauses.length === 0) {
      return this.getWorkstation(workstationId);
    }
    setClauses.push('updated_at = NOW()');
    values.push(workstationId);

    const result = await tenantQuery(
      postgresPool,
      `UPDATE workstations
       SET ${setClauses.join(', ')}
       WHERE tenant_id = get_current_tenant() AND id = $${paramIndex}
       RETURNING id, name, status, created_at, updated_at`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async deleteWorkstation(workstationId: string) {
    const result = await tenantQuery(
      postgresPool,
      `DELETE FROM workstations
       WHERE tenant_id = get_current_tenant() AND id = $1`,
      [workstationId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
