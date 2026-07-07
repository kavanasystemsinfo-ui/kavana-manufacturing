import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Inject } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDtoSchema, UpdateOrderDtoSchema, type CreateOrderDto, type UpdateOrderDto } from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { postgresPool } from '../db/postgres.provider.js';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() body: CreateOrderDto) {
    const validated = CreateOrderDtoSchema.parse(body);
    return this.ordersService.createOrder(validated);
  }

  @Get()
  async listOrders() {
    return this.ordersService.listOrders();
  }

  @Get('available')
  async listAvailableOrders() {
    const ctx = getTenantContext();
    const result = await postgresPool.query(
      `SELECT o.id, o.model_id, o.workstation_id, o.quantity, o.status, o.created_by,
              o.custom_fields, o.produced_quantity, o.defect_quantity,
              o.created_at, o.updated_at,
              mm.name as model_name,
              w.name as workstation_name
       FROM orders o
       LEFT JOIN manufacturing_models mm ON mm.tenant_id = o.tenant_id AND mm.id = o.model_id
       LEFT JOIN workstations w ON w.tenant_id = o.tenant_id AND w.id = o.workstation_id
       WHERE o.tenant_id = $1
         AND o.status IN ('pending', 'in_progress')
         AND o.workstation_id = (
           SELECT u.default_workstation_id
           FROM users u
           WHERE u.tenant_id = $1 AND u.id = $2
         )
       ORDER BY o.created_at DESC`,
      [ctx.tenantId.toString(), ctx.userId],
    );
    return result.rows;
  }

  @Get('workstations-status')
  async getWorkstationsStatus() {
    return this.ordersService.getWorkstationStatus();
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.ordersService.getOrder(id);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return order;
  }

  @Get(':id/activity')
  async getOrderActivity(@Param('id') id: string) {
    return this.ordersService.getActivity(id);
  }

  @Put(':id')
  async updateOrder(@Param('id') id: string, @Body() body: UpdateOrderDto) {
    const validated = UpdateOrderDtoSchema.parse(body);
    const order = await this.ordersService.updateOrder(id, validated);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return order;
  }

  @Delete(':id')
  async deleteOrder(@Param('id') id: string) {
    const deleted = await this.ordersService.deleteOrder(id);
    if (!deleted) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return { deleted: true };
  }
}
