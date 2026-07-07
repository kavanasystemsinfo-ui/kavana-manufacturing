import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import type { CreateOrderDto, UpdateOrderDto } from './dto.js';

const ORDER_FIELDS = `o.id, o.model_id, o.workstation_id, o.quantity, o.status, o.created_by,
  o.custom_fields, o.produced_quantity, o.defect_quantity, o.created_at, o.updated_at,
  COALESCE(mm.name, 'Sin modelo') as model_name,
  COALESCE(w.name, 'Sin puesto') as workstation_name`;

const ORDER_FROM = `orders o
  LEFT JOIN manufacturing_models mm ON mm.tenant_id = o.tenant_id AND mm.id = o.model_id
  LEFT JOIN workstations w ON w.tenant_id = o.tenant_id AND w.id = o.workstation_id`;

@Injectable()
export class OrdersService {
  async createOrder(dto: CreateOrderDto) {
    try {
      const context = getTenantContext();
      const newId = randomUUID();
      const customFields = JSON.stringify(dto.custom_fields ?? {});
      const code = (dto.custom_fields?.numero_orden as string) || `ORD-${newId.slice(0, 8).toUpperCase()}`;

      await tenantQuery(
        postgresPool,
        `INSERT INTO orders (id, tenant_id, model_id, workstation_id, quantity, custom_fields, created_by, code)
         VALUES ($1, get_current_tenant(), $2, $3, $4, $5, $6, $7)`,
        [newId, dto.model_id, dto.workstation_id, dto.quantity, customFields, context.userId, code],
      );

      const result = await tenantQuery(
        postgresPool,
        `SELECT ${ORDER_FIELDS}
         FROM ${ORDER_FROM}
         WHERE o.tenant_id = get_current_tenant() AND o.id = $1`,
        [newId],
      );
      return result.rows[0];
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create order: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listOrders() {
    const result = await tenantQuery(
      postgresPool,
      `SELECT ${ORDER_FIELDS}
       FROM ${ORDER_FROM}
       WHERE o.tenant_id = get_current_tenant()
       ORDER BY o.created_at DESC`,
    );
    return result.rows;
  }

  async getOrder(orderId: string) {
    const result = await tenantQuery(
      postgresPool,
      `SELECT ${ORDER_FIELDS}
       FROM ${ORDER_FROM}
       WHERE o.tenant_id = get_current_tenant() AND o.id = $1`,
      [orderId],
    );
    return result.rows[0] ?? null;
  }

  async updateOrder(orderId: string, dto: UpdateOrderDto) {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(dto.status);
      paramIndex++;
    }
    if (dto.workstation_id !== undefined) {
      setClauses.push(`workstation_id = $${paramIndex}`);
      values.push(dto.workstation_id);
      paramIndex++;
    }
    if (dto.custom_fields !== undefined) {
      setClauses.push(`custom_fields = $${paramIndex}`);
      values.push(JSON.stringify(dto.custom_fields));
      paramIndex++;
    }
    if (setClauses.length === 0) {
      return this.getOrder(orderId);
    }
    setClauses.push('updated_at = NOW()');
    values.push(orderId);

    await tenantQuery(
      postgresPool,
      `UPDATE orders SET ${setClauses.join(', ')}
       WHERE tenant_id = get_current_tenant() AND id = $${paramIndex}`,
      values,
    );

    return this.getOrder(orderId);
  }

  async deleteOrder(orderId: string) {
    const result = await tenantQuery(
      postgresPool,
      `DELETE FROM orders
       WHERE tenant_id = get_current_tenant() AND id = $1`,
      [orderId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getActivity(orderId: string) {
    const result = await tenantQuery(
      postgresPool,
      `SELECT pwb.id, pwb.type, pwb.start_time, pwb.end_time,
              pwb.produced_quantity, pwb.defect_quantity, pwb.downtime_reason,
              COALESCE(u.first_name || ' ' || u.last_name, u.username) as operator_name
       FROM production_work_blocks pwb
       LEFT JOIN users u ON u.tenant_id = pwb.tenant_id AND u.id = pwb.operator_id
       WHERE pwb.tenant_id = get_current_tenant() AND pwb.order_id = $1
       ORDER BY pwb.start_time ASC`,
      [orderId],
    );
    return result.rows;
  }

  async getWorkstationStatus() {
    const result = await tenantQuery(
      postgresPool,
      `SELECT w.id, w.name, w.code, w.status,
              pwb.type as last_block_type, pwb.start_time as last_block_start,
              COALESCE(u.first_name || ' ' || u.last_name, u.username) as operator_name
       FROM workstations w
       LEFT JOIN LATERAL (
         SELECT pwb.type, pwb.start_time, pwb.operator_id
         FROM production_work_blocks pwb
         WHERE pwb.tenant_id = w.tenant_id AND pwb.workstation_id = w.id
         ORDER BY pwb.start_time DESC
         LIMIT 1
       ) pwb ON true
       LEFT JOIN users u ON u.tenant_id = w.tenant_id AND u.id = pwb.operator_id
       WHERE w.tenant_id = get_current_tenant() AND w.status = 'active'
       ORDER BY w.name`,
    );
    return result.rows;
  }
}
