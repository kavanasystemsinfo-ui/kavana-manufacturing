import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import type { CreateManufacturingModelDto, UpdateManufacturingModelDto } from './dto.js';

@Injectable()
export class ManufacturingModelsService {
  async createModel(dto: CreateManufacturingModelDto) {
    try {
      const result = await tenantQuery(
        postgresPool,
        `INSERT INTO manufacturing_models (tenant_id, name, unit_of_measure, target_rate, workstation_id)
         VALUES (get_current_tenant(), $1, $2, $3, $4)
         RETURNING id, name, unit_of_measure, target_rate, workstation_id, created_at, updated_at`,
        [dto.name, dto.unit_of_measure ?? 'piezas/h', dto.target_rate ?? null, dto.workstation_id ?? null],
      );
      return result.rows[0];
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create manufacturing model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listModels() {
    const result = await tenantQuery(
      postgresPool,
      `SELECT id, name, unit_of_measure, target_rate, workstation_id, created_at, updated_at
       FROM manufacturing_models
       WHERE tenant_id = get_current_tenant()
       ORDER BY created_at DESC`,
    );
    return result.rows;
  }

  async getModel(modelId: string) {
    const result = await tenantQuery(
      postgresPool,
      `SELECT id, name, unit_of_measure, target_rate, workstation_id, created_at, updated_at
       FROM manufacturing_models
       WHERE tenant_id = get_current_tenant() AND id = $1`,
      [modelId],
    );
    return result.rows[0] ?? null;
  }

  async updateModel(modelId: string, dto: UpdateManufacturingModelDto) {
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      values.push(dto.name);
      paramIndex++;
    }
    if (dto.unit_of_measure !== undefined) {
      setClauses.push(`unit_of_measure = $${paramIndex}`);
      values.push(dto.unit_of_measure);
      paramIndex++;
    }
    if (dto.target_rate !== undefined) {
      setClauses.push(`target_rate = $${paramIndex}`);
      values.push(dto.target_rate);
      paramIndex++;
    }
    if (dto.workstation_id !== undefined) {
      setClauses.push(`workstation_id = $${paramIndex}`);
      values.push(dto.workstation_id);
      paramIndex++;
    }
    if (setClauses.length === 0) {
      return this.getModel(modelId);
    }
    setClauses.push('updated_at = NOW()');
    values.push(modelId);

    const result = await tenantQuery(
      postgresPool,
      `UPDATE manufacturing_models
       SET ${setClauses.join(', ')}
       WHERE tenant_id = get_current_tenant() AND id = $${paramIndex}
       RETURNING id, name, unit_of_measure, target_rate, workstation_id, created_at, updated_at`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async deleteModel(modelId: string) {
    const result = await tenantQuery(
      postgresPool,
      `DELETE FROM manufacturing_models
       WHERE tenant_id = get_current_tenant() AND id = $1`,
      [modelId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
