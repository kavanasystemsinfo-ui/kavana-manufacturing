import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { postgresPool } from '../db/postgres.provider.js';
import type { TenantCapabilities } from './capabilities.interface.js';
import {
  getCachedCapabilities,
  setCachedCapabilities,
  invalidateCachedCapabilities,
} from './capabilities-cache.js';
import { CUSTOM_FIELD_TYPES, customFieldsSchemaValidator, type CustomFieldType } from '../common/custom-fields.js';
import { parseAuditQuery, type ConfigAuditEntry } from './audit-query.js';
import type { PoolClient } from 'pg';

// ponytail: known module keys from migration 005 seed. Add here when a new module is created.
const KNOWN_MODULE_KEYS = new Set([
  'core_mes',
  'oee_monitoring',
  'quality_assurance',
  'cost_management',
  'materials_management',
]);

@Injectable()
export class TenantCapabilitiesService {
  async getCapabilities(tenantId: bigint): Promise<TenantCapabilities> {
    // 1. Check current governance_version (cheap single-column read)
    const versionResult = await postgresPool.query(
      'SELECT governance_version FROM tenants WHERE id = $1',
      [tenantId.toString()],
    );

    if (versionResult.rowCount === 0) {
      throw new ForbiddenException('Tenant not found.');
    }

    const currentVersion = Number(versionResult.rows[0].governance_version);

    // 2. Try L1 cache
    const cached = getCachedCapabilities(tenantId, currentVersion);
    if (cached) {
      return cached;
    }

    // 3. Cache miss → full read
    const result = await postgresPool.query(
      `SELECT feature_matrix, custom_fields_schema, governance_version
       FROM tenants
       WHERE id = $1`,
      [tenantId.toString()],
    );

    if (result.rowCount === 0) {
      throw new ForbiddenException('Tenant not found.');
    }

    const row = result.rows[0];
    const featureMatrix = row.feature_matrix;
    const modularMatrix = featureMatrix?.modular_matrix ?? {};

    const modules: TenantCapabilities['modules'] = {};
    for (const [key, value] of Object.entries(modularMatrix)) {
      const mod = value as Record<string, unknown>;
      modules[key] = {
        enabled: mod.enabled === true,
        features: (mod.features as Record<string, unknown>) ?? {},
      };
    }

    const capabilities: TenantCapabilities = {
      tenantId,
      governanceVersion: Number(row.governance_version),
      modules,
      quotas: featureMatrix?.resource_quotas ?? {},
      customFieldsSchema: row.custom_fields_schema ?? {},
    };

    // 4. Store in L1
    setCachedCapabilities(capabilities);

    return capabilities;
  }

  async isModuleEnabled(tenantId: bigint, moduleKey: string): Promise<boolean> {
    if (!KNOWN_MODULE_KEYS.has(moduleKey)) {
      // ponytail: unknown modules always return false. Fail-safe, same as DB function.
      return false;
    }

    const capabilities = await this.getCapabilities(tenantId);
    return capabilities.modules[moduleKey]?.enabled === true;
  }

  async toggleModule(tenantId: bigint, userId: string, moduleKey: string, enabled: boolean): Promise<void> {
    if (!KNOWN_MODULE_KEYS.has(moduleKey)) {
      throw new ForbiddenException(`Unknown module: ${moduleKey}`);
    }

    if (moduleKey === 'core_mes' && !enabled) {
      throw new ForbiddenException('The core_mes module cannot be disabled.');
    }

    const client = await postgresPool.connect();
    try {
      await client.query('BEGIN');
      await this.setAuditActor(client, userId);

      // Capture hard_limits before update for integrity check
      const hardLimitsBefore = await client.query(
        'SELECT hard_limits FROM tenants WHERE id = $1',
        [tenantId.toString()],
      );

      const updateResult = await client.query(
        `UPDATE tenants
         SET feature_matrix = jsonb_set(
               feature_matrix,
               ARRAY['modular_matrix', $2, 'enabled'],
               $3::jsonb
             ),
             governance_version = governance_version + 1,
             updated_at = NOW()
         WHERE id = $1
         RETURNING feature_matrix, governance_version`,
        [tenantId.toString(), moduleKey, enabled ? 'true' : 'false'],
      );

      if (updateResult.rowCount === 0) {
        throw new ForbiddenException('Tenant not found.');
      }

      // Defense-in-depth: verify hard_limits was not mutated
      const hardLimitsAfter = await client.query(
        'SELECT hard_limits FROM tenants WHERE id = $1',
        [tenantId.toString()],
      );
      if (JSON.stringify(hardLimitsBefore.rows[0]?.hard_limits) !== JSON.stringify(hardLimitsAfter.rows[0]?.hard_limits)) {
        await client.query('ROLLBACK');
        throw new ForbiddenException('Integrity violation: hard_limits was modified during feature_matrix update.');
      }

      await client.query('COMMIT');

      // Invalidate L1 cache so next request fetches new state
      this.invalidateCache(tenantId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateCustomFieldsSchema(tenantId: bigint, userId: string, newSchema: any): Promise<void> {
    // 1. Meta-validation of the proposed schema structure using Zod
    // La definición de qué es un esquema válido vive en common/custom-fields.ts,
    // junto al constructor que valida las órdenes: así no pueden divergir.
    const CustomFieldsSchemaValidator = customFieldsSchemaValidator;

    // Filter out fields with empty keys (user may have added but not filled in)
    if (newSchema?.fields && Array.isArray(newSchema.fields)) {
      newSchema.fields = newSchema.fields.filter((f: any) => f.key && f.key.trim());
    }

    console.log('[CUSTOM_FIELDS] Received schema:', JSON.stringify(newSchema));

    let validatedSchema;
    try {
      validatedSchema = CustomFieldsSchemaValidator.parse(newSchema);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ForbiddenException(`Invalid schema structure: ${msg}`);
    }

    // 2. Enforce limits and quotas (using active quotas in feature_matrix)
    const capabilities = await this.getCapabilities(tenantId);
    const maxCustomFields = Number((capabilities.quotas as Record<string, any>)?.entities?.max_custom_fields ?? 5);

    if (validatedSchema.fields.length > maxCustomFields) {
      throw new ForbiddenException('Quota Exceeded: Maximum custom fields limit reached.');
    }

    // 3. Persist update in DB within a transaction (Postgres trigger handles audit)
    const client = await postgresPool.connect();
    try {
      await client.query('BEGIN');
      await this.setAuditActor(client, userId);

      // Capture hard_limits before update for integrity check
      const hardLimitsBefore = await client.query(
        'SELECT hard_limits FROM tenants WHERE id = $1',
        [tenantId.toString()],
      );

      const updateResult = await client.query(
        `UPDATE tenants
         SET custom_fields_schema = jsonb_build_object('production_orders', $2::jsonb),
             updated_at = NOW()
         WHERE id = $1
         RETURNING custom_fields_schema`,
        [tenantId.toString(), JSON.stringify(validatedSchema)],
      );

      if (updateResult.rowCount === 0) {
        throw new ForbiddenException('Tenant not found.');
      }

      // Defense-in-depth: verify hard_limits was not mutated
      const hardLimitsAfter = await client.query(
        'SELECT hard_limits FROM tenants WHERE id = $1',
        [tenantId.toString()],
      );
      if (JSON.stringify(hardLimitsBefore.rows[0]?.hard_limits) !== JSON.stringify(hardLimitsAfter.rows[0]?.hard_limits)) {
        await client.query('ROLLBACK');
        throw new ForbiddenException('Integrity violation: hard_limits was modified during custom_fields_schema update.');
      }

      await client.query('COMMIT');

      // Invalidate L1 cache so next request fetches new state
      this.invalidateCache(tenantId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  invalidateCache(tenantId: bigint): void {
    invalidateCachedCapabilities(tenantId);
  }

  /**
   * Historial de cambios de configuración del tenant (auditoría).
   *
   * Lo escribe un trigger sobre `tenants`, no esta capa, así que aquí solo se
   * lee: si alguien cambia la configuración por SQL directo, también queda.
   */
  async getConfigAudit(
    tenantId: bigint,
    query: { limit?: string; offset?: string; from?: string; to?: string },
  ): Promise<{ entries: ConfigAuditEntry[]; total: number }> {
    const { limit, offset, from, to } = parseAuditQuery(query);

    const conditions = ['a.tenant_id = $1'];
    const params: unknown[] = [String(tenantId)];
    if (from) {
      params.push(from);
      conditions.push(`a.created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`a.created_at <= $${params.length}`);
    }
    const where = conditions.join(' AND ');

    const totalResult = await postgresPool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM tenant_config_audit WHERE ${where}`,
      params,
    );

    const rows = await postgresPool.query<ConfigAuditEntry>(
      `SELECT a.id, a.actor_user_id, u.username AS actor_username, a.action,
              a.previous_value, a.new_value, a.metadata, a.created_at
       FROM tenant_config_audit a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE ${where}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return { entries: rows.rows, total: totalResult.rows[0]?.total ?? 0 };
  }

  async getToolingTypes(tenantId: bigint): Promise<string[]> {
    const result = await postgresPool.query(
      `SELECT feature_matrix#>'{tooling,types}' as types FROM tenants WHERE id = $1`,
      [tenantId.toString()],
    );
    if (result.rowCount === 0) return [];
    return result.rows[0]?.types ?? [];
  }

  /**
   * Deja constancia de quién hace el cambio, para el historial de auditoría.
   *
   * Tiene que ir dentro de la misma transacción que el UPDATE (set_config con
   * is_local = true), porque si no el disparador que escribe la auditoría no ve
   * el valor y el cambio queda sin autor.
   */
  private async setAuditActor(client: PoolClient, userId: string): Promise<void> {
    await client.query(`SELECT set_config('app.actor_user_id', $1, true)`, [userId ?? '']);
  }

  async saveToolingTypes(tenantId: bigint, userId: string, types: string[]): Promise<void> {
    const client = await postgresPool.connect();
    try {
      await client.query('BEGIN');
      await this.setAuditActor(client, userId);

      await client.query(
        `UPDATE tenants
         SET feature_matrix = jsonb_set(
               COALESCE(feature_matrix, '{}'::jsonb),
               '{tooling,types}',
               $2::jsonb
             ),
             updated_at = NOW()
         WHERE id = $1`,
        [tenantId.toString(), JSON.stringify(types)],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    this.invalidateCache(tenantId);
  }
}

