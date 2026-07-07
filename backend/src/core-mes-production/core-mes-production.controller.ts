import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Inject } from '@nestjs/common';
import { CoreMesProductionService } from './core-mes-production.service.js';
import {
  createProductionOrderSchema,
  syncWorkBlockSchema,
  transitionProductionOrderSchema,
  updateCustomFieldsSchema,
} from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { postgresPool } from '../db/postgres.provider.js';

const ORDER_NOT_FOUND_MSG = 'The requested production order does not exist or you do not have permission.';

@Controller('production')
export class CoreMesProductionController {
  constructor(@Inject(CoreMesProductionService) private readonly service: CoreMesProductionService) {}

  @Get('orders')
  listOrders() {
    return this.service.listOrders();
  }

  @Get('operator/context')
  async getOperatorContext() {
    const ctx = getTenantContext();
    const result = await postgresPool.query(
      `SELECT u.id as operator_id,
              COALESCE(NULLIF(u.first_name || ' ' || u.last_name, ' '), u.username) as operator_name,
              u.default_workstation_id, w.name as workstation_name
       FROM users u
       LEFT JOIN workstations w ON w.tenant_id = u.tenant_id AND w.id = u.default_workstation_id
       WHERE u.tenant_id = $1 AND u.id = $2`,
      [ctx.tenantId.toString(), ctx.userId],
    );
    if (result.rowCount === 0) {
      return { operatorId: ctx.userId, operatorName: null, workstationId: null, workstationName: null };
    }
    const row = result.rows[0];
    return {
      operatorId: row.operator_id,
      operatorName: row.operator_name ?? null,
      workstationId: row.default_workstation_id ?? null,
      workstationName: row.workstation_name ?? null,
    };
  }

  @Post('orders')
  createOrder(@Body() body: unknown) {
    const dto = createProductionOrderSchema.parse(body);
    return this.service.createOrder(dto);
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    const order = await this.service.getOrder(id);
    if (!order) {
      throw new NotFoundException(ORDER_NOT_FOUND_MSG);
    }
    return order;
  }

  @Post('orders/:id/transition')
  transitionOrder(@Param('id') id: string, @Body() body: unknown) {
    const dto = transitionProductionOrderSchema.parse(body);
    return this.service.transitionOrder(id, dto);
  }

  @Post('time-logs/sync')
  syncWorkBlock(@Body() body: unknown) {
    const dto = syncWorkBlockSchema.parse(body);
    return this.service.syncWorkBlock(dto);
  }

  @Get('orders/:id/logs')
  listOrderLogs(@Param('id') id: string) {
    return this.service.listOrderLogs(id);
  }

  @Patch('orders/:id/custom-fields')
  async updateCustomFields(@Param('id') id: string, @Body() body: unknown) {
    const dto = updateCustomFieldsSchema.parse(body);
    const order = await this.service.updateCustomFields(id, dto);
    if (!order) {
      throw new NotFoundException(ORDER_NOT_FOUND_MSG);
    }
    return order;
  }
}
