import { BadRequestException, Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { postgresPool } from '../db/postgres.provider.js';
import { withTenantTransaction } from '../db/withTenantTransaction.js';
import type { CreateProductionOrderDto, SyncWorkBlockDto, TransitionProductionOrderDto, UpdateCustomFieldsDto } from './dto.js';
import { TenantCapabilitiesService } from '../tenant-capabilities/tenant-capabilities.service.js';

@Injectable()
export class CoreMesProductionService {
  constructor(
    @Inject(TenantCapabilitiesService) private readonly capabilities: TenantCapabilitiesService,
  ) {}

  async createOrder(dto: CreateProductionOrderDto) {
    const context = getTenantContext();

    const caps = await this.capabilities.getCapabilities(context.tenantId);
    const orderFieldsSchema = (caps.customFieldsSchema as any)?.production_orders;
    const fieldsArray = Array.isArray(orderFieldsSchema?.fields) ? orderFieldsSchema.fields : [];

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of fieldsArray) {
      if (typeof field.key !== 'string') continue;

      let zodField: z.ZodTypeAny;
      if (field.type === 'string') zodField = z.string();
      else if (field.type === 'number') zodField = z.number();
      else if (field.type === 'boolean') zodField = z.boolean();
      else zodField = z.unknown();

      if (!field.required) zodField = zodField.optional();
      shape[field.key] = zodField;
    }

    const dynamicZodSchema = z.object(shape).strict();
    try { dynamicZodSchema.parse(dto.custom_fields ?? {}); }
    catch (err) { const msg = err instanceof Error ? err.message : String(err); throw new BadRequestException(`Invalid custom fields: ${msg}`); }

    return withTenantTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO orders (tenant_id, code, quantity, workstation_id, custom_fields, status, created_by)
         VALUES ($1::bigint, $2, $3::int, $4::uuid, $5::jsonb, 'pending', $6)
         RETURNING id, code, quantity, produced_quantity, defect_quantity, status, workstation_id, custom_fields, created_at, updated_at`,
        [context.tenantId, dto.code, dto.target_quantity, dto.workstation_id ?? null, JSON.stringify(dto.custom_fields), context.userId],
      );
      return result.rows[0];
    }).catch(throwInternalServerError);
  }

  async listOrders() {
    const context = getTenantContext();
    const result = await postgresPool.query(
      `SELECT id, code, quantity, produced_quantity, defect_quantity, status, workstation_id, custom_fields, created_at, updated_at
       FROM orders
       WHERE tenant_id = $1::bigint
       ORDER BY created_at DESC`,
      [context.tenantId],
    );
    return result.rows;
  }

  async getOrder(orderId: string) {
    const context = getTenantContext();
    const result = await postgresPool.query(
      `SELECT id, code, quantity, produced_quantity, defect_quantity, status, workstation_id, custom_fields, created_at, updated_at
       FROM orders
       WHERE tenant_id = $1 AND id = $2`,
      [String(context.tenantId), orderId],
    );
    return result.rows[0] ?? null;
  }

  async updateCustomFields(orderId: string, dto: UpdateCustomFieldsDto) {
    const context = getTenantContext();

    const caps = await this.capabilities.getCapabilities(context.tenantId);
    const orderFieldsSchema = (caps.customFieldsSchema as any)?.production_orders;
    const fieldsArray = Array.isArray(orderFieldsSchema?.fields) ? orderFieldsSchema.fields : [];

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of fieldsArray) {
      if (typeof field.key !== 'string') continue;
      let zodField: z.ZodTypeAny;
      if (field.type === 'string') zodField = z.string();
      else if (field.type === 'number') zodField = z.number();
      else if (field.type === 'boolean') zodField = z.boolean();
      else zodField = z.unknown();
      if (!field.required) zodField = zodField.optional();
      shape[field.key] = zodField;
    }

    const dynamicZodSchema = z.object(shape).strict();
    try { dynamicZodSchema.parse(dto.custom_fields ?? {}); }
    catch (err) { const msg = err instanceof Error ? err.message : String(err); throw new BadRequestException(`Invalid custom fields: ${msg}`); }

    const result = await postgresPool.query(
      `UPDATE orders SET custom_fields = $3, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, code, quantity, produced_quantity, defect_quantity, status, workstation_id, custom_fields, created_at, updated_at`,
      [context.tenantId, orderId, JSON.stringify(dto.custom_fields)],
    );

    if (result.rowCount === 0) {
      throw new BadRequestException('The requested production order does not exist or you do not have permission.');
    }
    return result.rows[0];
  }

  async transitionOrder(orderId: string, dto: TransitionProductionOrderDto) {
    const context = getTenantContext();

    return withTenantTransaction(async (client) => {
      const order = await this.lockOrder(client, orderId);

      if (!order) {
        throw new BadRequestException('The requested production order does not exist or you do not have permission.');
      }

      if (dto.target_status === 'in_progress' && !dto.workstation_id && !order.workstation_id) {
        throw new BadRequestException('A workstation_id is required to start production.');
      }

      const workstationId = dto.workstation_id ?? order.workstation_id;

      const updateResult = await client.query(
        `UPDATE orders
         SET status = $3, workstation_id = COALESCE($4, workstation_id), updated_at = NOW()
WHERE tenant_id = $1::bigint AND id = $2::uuid
         RETURNING id, code, quantity, produced_quantity, defect_quantity, status, workstation_id, custom_fields, created_at, updated_at`,
        [context.tenantId, orderId, dto.target_status, workstationId ?? null],
      );

      return updateResult.rows[0];
    }).catch((error) => {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Production state mutation aborted: ${(error as Error).message}`);
    });
  }

  async syncWorkBlock(dto: SyncWorkBlockDto) {
    const context = getTenantContext();
    const tenantId = String(context.tenantId);

    return withTenantTransaction(async (client) => {
      const order = await this.lockOrder(client, dto.order_id);

      if (!order) {
        throw new BadRequestException('The requested production order does not exist or you do not have permission.');
      }

      const overlapCheck = await client.query(
        `SELECT 1 FROM production_work_blocks
         WHERE operator_id = $1::uuid AND tenant_id = $2::bigint AND id != $3::uuid
           AND (start_time, end_time) OVERLAPS ($4::timestamptz, $5::timestamptz)
         LIMIT 1`,
        [dto.operator_id, String(tenantId), dto.id, dto.start_time, dto.end_time]
      );

      if (overlapCheck.rows.length > 0) {
        throw new BadRequestException('El bloque de tiempo se solapa con otro registro existente para este operario.');
      }

      const isNewBlock = await this.insertWorkBlock(client, dto, tenantId);

      let updateResult;
      if (isNewBlock) {
        updateResult = await client.query(
          `UPDATE orders
           SET status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END,
               workstation_id = COALESCE($3::uuid, workstation_id),
               produced_quantity = produced_quantity + COALESCE($4::numeric, 0),
               defect_quantity = defect_quantity + COALESCE($5::numeric, 0),
               updated_at = NOW()
           WHERE tenant_id = $1::bigint AND id = $2::uuid
           RETURNING id, code, quantity, produced_quantity, defect_quantity, status, workstation_id, custom_fields, created_at, updated_at`,
          [tenantId, dto.order_id, dto.workstation_id, dto.produced_quantity ?? 0, dto.defect_quantity ?? 0],
        );
      } else {
        updateResult = await client.query(
          `SELECT id, code, quantity, produced_quantity, defect_quantity, status, workstation_id, custom_fields, created_at, updated_at
           FROM orders WHERE tenant_id = $1::bigint AND id = $2::uuid`,
          [tenantId, dto.order_id]
        );
      }

      return {
        synced: true,
        client_event_id: dto.id,
        order: updateResult.rows[0],
      };
    }).catch((error) => {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Sync operation failed: ${message}`);
    });
  }

  async listOrderLogs(orderId: string) {
    const context = getTenantContext();
    const result = await postgresPool.query(
      `SELECT id, order_id, workstation_id, operator_id, type, downtime_reason, start_time, end_time, produced_quantity, defect_quantity, observations, is_offline_event, client_device_id
       FROM production_work_blocks
       WHERE tenant_id = $1::bigint AND order_id = $2::uuid
       ORDER BY start_time ASC`,
      [String(context.tenantId), orderId],
    );
    return result.rows;
  }

  private async lockOrder(client: PoolClient, orderId: string) {
    const context = getTenantContext();
    const result = await client.query(
      `SELECT id, status, workstation_id
       FROM orders
       WHERE tenant_id = $1::bigint AND id = $2::uuid
       FOR UPDATE`,
      [String(context.tenantId), orderId],
    );
    return result.rows[0] ?? null;
  }

private async insertWorkBlock(
    client: PoolClient,
    dto: SyncWorkBlockDto,
    tenantId: string,
  ): Promise<boolean> {
    // FIX A4 (2026-08-21): fingerprint del contenido semántico del bloque.
    // El dedup por client_event_id solo atrapa el MISMO uuid; un replay con
    // uuid nuevo y produced_quantity cambiada duplicaba producción. Con el
    // fingerprint (hash de orden+operario+times+cantidades), el mismo hecho
    // de producción es irrepetible aunque cambie el uuid. El UNIQUE en BD
    // (migración 039) rechaza el duplicado; lo tratamos como ya-sincronizado.
    const fingerprint = createHash('sha256')
      .update([
        tenantId,
        dto.order_id,
        dto.operator_id,
        dto.type,
        dto.start_time ?? '',
        dto.end_time ?? '',
        String(dto.type === 'produccion' ? (dto.produced_quantity ?? 0) : ''),
        String(dto.type === 'produccion' ? (dto.defect_quantity ?? 0) : ''),
      ].join('|'))
      .digest('hex');

    const sql = `
      INSERT INTO production_work_blocks (
        tenant_id, id, order_id, workstation_id, operator_id,
        client_event_id, type, start_time, end_time, downtime_reason,
        produced_quantity, defect_quantity, observations, is_offline_event, client_device_id, version, event_fingerprint
      )
      VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
              $6::uuid, $7, $8::timestamptz, $9::timestamptz, $10,
              $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (tenant_id, event_fingerprint) DO NOTHING
      RETURNING id
    `;
    const values = [
      tenantId.toString(),
      dto.id,
      dto.order_id,
      dto.workstation_id,
      dto.operator_id,
      dto.id,
      dto.type,
      dto.start_time,
      dto.end_time,
      dto.type === 'parada' ? (dto.downtime_reason ?? null) : null,
      dto.type === 'produccion' ? (dto.produced_quantity ?? 0) : 0,
      dto.type === 'produccion' ? (dto.defect_quantity ?? 0) : 0,
      dto.observations || null,
      dto.is_offline_event ?? false,
      dto.client_device_id || null,
      (dto as any).version ?? 1,
    ];
    const result = await client.query(sql, values);
    return result.rowCount !== null && result.rowCount > 0;
  }
}

function throwInternalServerError(error: unknown): never {
  throw new InternalServerErrorException(`Production command failed: ${error instanceof Error ? error.message : String(error)}`);
}
