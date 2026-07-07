import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string | null;
  status: 'active' | 'suspended' | 'trial';
  feature_matrix: Record<string, unknown>;
  custom_fields_schema: Record<string, unknown>;
  governance_version: number;
  created_at: string;
  updated_at: string;
}

export interface TenantStats {
  tenant_id: string;
  user_count: number;
  workstation_count: number;
  order_count: number;
  production_block_count: number;
}

export interface CreateTenantInput {
  id: number;
  name: string;
  subdomain: string;
  status?: 'active' | 'suspended' | 'trial';
  modules?: string[];
  admin_username?: string;
  admin_password?: string;
}

@Injectable()
export class GlobalAdminService {
  async listTenants(): Promise<Tenant[]> {
    const r = await postgresPool.query(
      `SELECT id, name, subdomain, status, feature_matrix, custom_fields_schema, governance_version, created_at, updated_at
       FROM tenants
       ORDER BY created_at DESC`
    );
    return r.rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      subdomain: row.subdomain,
      status: row.status,
      feature_matrix: row.feature_matrix,
      custom_fields_schema: row.custom_fields_schema,
      governance_version: Number(row.governance_version),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async getTenant(id: number): Promise<Tenant> {
    const r = await postgresPool.query(
      `SELECT id, name, subdomain, status, feature_matrix, custom_fields_schema, governance_version, created_at, updated_at
       FROM tenants
       WHERE id = $1`,
      [id]
    );
    if (r.rowCount === 0) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    const row = r.rows[0];
    return {
      id: String(row.id),
      name: row.name,
      subdomain: row.subdomain,
      status: row.status,
      feature_matrix: row.feature_matrix,
      custom_fields_schema: row.custom_fields_schema,
      governance_version: Number(row.governance_version),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async getTenantStats(id: number): Promise<TenantStats> {
    const [users, workstations, orders, blocks] = await Promise.all([
      postgresPool.query('SELECT COUNT(*)::int as c FROM users WHERE tenant_id = $1', [id]),
      postgresPool.query('SELECT COUNT(*)::int as c FROM workstations WHERE tenant_id = $1', [id]),
      postgresPool.query('SELECT COUNT(*)::int as c FROM orders WHERE tenant_id = $1', [id]),
      postgresPool.query('SELECT COUNT(*)::int as c FROM production_work_blocks WHERE tenant_id = $1', [id]),
    ]);
    return {
      tenant_id: String(id),
      user_count: users.rows[0].c,
      workstation_count: workstations.rows[0].c,
      order_count: orders.rows[0].c,
      production_block_count: blocks.rows[0].c,
    };
  }

  async createTenant(input: CreateTenantInput): Promise<Tenant & { admin_created?: boolean }> {
    const existing = await postgresPool.query('SELECT id FROM tenants WHERE id = $1', [input.id]);
    if (existing.rowCount! > 0) {
      throw new ConflictException(`Tenant ${input.id} already exists`);
    }

    if (input.subdomain) {
      const subdomainExists = await postgresPool.query('SELECT id FROM tenants WHERE subdomain = $1', [input.subdomain]);
      if (subdomainExists.rowCount! > 0) {
        throw new ConflictException(`Subdomain '${input.subdomain}' already exists`);
      }
    }

    const modules = input.modules ?? ['core_mes'];
    const featureMatrix = {
      modular_matrix: Object.fromEntries(
        modules.map((m) => [m, { enabled: true, features: {} }])
      ),
      resource_quotas: {
        entities: { max_custom_fields: 5 },
      },
    };

    const client = await postgresPool.connect();
    let adminCreated = false;
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO tenants (id, name, subdomain, status, feature_matrix)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.id, input.name, input.subdomain, input.status ?? 'trial', JSON.stringify(featureMatrix)]
      );

      if (input.admin_username && input.admin_password) {
        const salt = randomBytes(16).toString('hex');
        const hash = createHash('sha256').update(salt + input.admin_password).digest('hex');
        const passwordHash = `${salt}:${hash}`;

        await client.query(
          `INSERT INTO users (tenant_id, username, password_hash, role)
           VALUES ($1, $2, $3, 'tenant_admin')`,
          [input.id, input.admin_username, passwordHash],
        );
        adminCreated = true;
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const tenant = await this.getTenant(input.id);
    return { ...tenant, admin_created: adminCreated };
  }

  async updateTenant(id: number, data: { name?: string; status?: 'active' | 'suspended' | 'trial'; subdomain?: string }): Promise<Tenant> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.subdomain !== undefined) {
      sets.push(`subdomain = $${idx++}`);
      values.push(data.subdomain || null);
    }

    if (sets.length === 0) {
      return this.getTenant(id);
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const r = await postgresPool.query(
      `UPDATE tenants SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, name, subdomain, status, feature_matrix, custom_fields_schema, governance_version, created_at, updated_at`,
      values
    );

    if (r.rowCount === 0) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }

    const row = r.rows[0];
    return {
      id: String(row.id),
      name: row.name,
      subdomain: row.subdomain,
      status: row.status,
      feature_matrix: row.feature_matrix,
      custom_fields_schema: row.custom_fields_schema,
      governance_version: Number(row.governance_version),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async deleteTenant(id: number): Promise<void> {
    const r = await postgresPool.query('DELETE FROM tenants WHERE id = $1', [id]);
    if (r.rowCount === 0) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
  }

  async toggleModule(tenantId: number, moduleKey: string, enabled: boolean): Promise<Tenant> {
    const r = await postgresPool.query(
      `UPDATE tenants
       SET feature_matrix = jsonb_set(
             feature_matrix,
             ARRAY['modular_matrix', $2, 'enabled'],
             $3::jsonb
           ),
           governance_version = governance_version + 1,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, subdomain, status, feature_matrix, custom_fields_schema, governance_version, created_at, updated_at`,
      [tenantId, moduleKey, enabled ? 'true' : 'false']
    );

    if (r.rowCount === 0) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const row = r.rows[0];
    return {
      id: String(row.id),
      name: row.name,
      subdomain: row.subdomain,
      status: row.status,
      feature_matrix: row.feature_matrix,
      custom_fields_schema: row.custom_fields_schema,
      governance_version: Number(row.governance_version),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
