import { Injectable } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';

@Injectable()
export class MaterialsService {
  // ─── RAW MATERIALS ───
  async listMaterials(tenantId: bigint) {
    const r = await tenantQuery(postgresPool,
      'SELECT id, code, name, description, unit, unit_cost, category, supplier, min_stock, is_active, created_at FROM raw_materials WHERE tenant_id = get_current_tenant() ORDER BY category, name');
    return r.rows;
  }

  async createMaterial(tenantId: bigint, data: any) {
    const r = await tenantQuery(postgresPool,
      `INSERT INTO raw_materials (tenant_id, code, name, description, unit, unit_cost, category, supplier, min_stock)
       VALUES (get_current_tenant(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.code, data.name, data.description || null, data.unit, data.unit_cost || 0, data.category || null, data.supplier || null, data.min_stock || 0]);
    return r.rows[0];
  }

  async updateMaterial(tenantId: bigint, id: string, data: any) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && ['code','name','description','unit','unit_cost','category','supplier','min_stock','is_active'].includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    const r = await tenantQuery(postgresPool,
      `UPDATE raw_materials SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}::uuid AND tenant_id = get_current_tenant() RETURNING *`, values);
    return r.rows[0] || null;
  }

  async deleteMaterial(tenantId: bigint, id: string) {
    await tenantQuery(postgresPool, 'DELETE FROM raw_materials WHERE id = $1::uuid AND tenant_id = get_current_tenant()', [id]);
  }

  // ─── BOM ───
  async getBomForModel(tenantId: bigint, modelId: string) {
    const r = await tenantQuery(postgresPool,
      `SELECT b.id, b.model_id, b.material_id, b.quantity, b.waste_percent, b.notes,
              m.code as material_code, m.name as material_name, m.unit, m.unit_cost, m.category
       FROM bom_items b
       JOIN raw_materials m ON m.id = b.material_id AND m.tenant_id = b.tenant_id
       WHERE b.tenant_id = get_current_tenant() AND b.model_id = $1::uuid
       ORDER BY m.category, m.name`, [modelId]);
    return r.rows;
  }

  async getAllBom(tenantId: bigint) {
    const r = await tenantQuery(postgresPool,
      `SELECT b.*, m.code as material_code, m.name as material_name, m.unit, m.category,
              mod.name as model_name
       FROM bom_items b
       JOIN raw_materials m ON m.id = b.material_id AND m.tenant_id = b.tenant_id
       JOIN manufacturing_models mod ON mod.id = b.model_id AND mod.tenant_id = b.tenant_id
       WHERE b.tenant_id = get_current_tenant()
       ORDER BY mod.name, m.category`);
    return r.rows;
  }

  async upsertBomItem(tenantId: bigint, data: { model_id: string; material_id: string; quantity: number; waste_percent?: number; notes?: string }) {
    const r = await tenantQuery(postgresPool,
      `INSERT INTO bom_items (tenant_id, model_id, material_id, quantity, waste_percent, notes)
       VALUES (get_current_tenant(), $1::uuid, $2::uuid, $3, $4, $5)
       ON CONFLICT (tenant_id, model_id, material_id)
       DO UPDATE SET quantity = EXCLUDED.quantity, waste_percent = EXCLUDED.waste_percent, notes = EXCLUDED.notes, updated_at = NOW()
       RETURNING *`,
      [data.model_id, data.material_id, data.quantity, data.waste_percent || 0, data.notes || null]);
    return r.rows[0];
  }

  async deleteBomItem(tenantId: bigint, id: string) {
    await tenantQuery(postgresPool, 'DELETE FROM bom_items WHERE id = $1::uuid AND tenant_id = get_current_tenant()', [id]);
  }

  // ─── MODELS BY WORKSTATION (for supervisor) ───
  async getModelsByWorkstation(tenantId: bigint, workstationId: string) {
    const r = await tenantQuery(postgresPool,
      `SELECT id, name, description, unit_of_measure, target_rate
       FROM manufacturing_models
       WHERE tenant_id = get_current_tenant() AND workstation_id = $1::uuid
       ORDER BY name`, [workstationId]);
    return r.rows;
  }
}
