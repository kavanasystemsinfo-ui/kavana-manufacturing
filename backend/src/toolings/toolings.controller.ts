import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, Inject } from '@nestjs/common';
import { ToolingsService } from './toolings.service.js';
import { createToolingSchema, updateToolingSchema } from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';

@Controller('toolings')
export class ToolingsController {
  constructor(@Inject(ToolingsService) private readonly service: ToolingsService) {}

  @Get()
  async list() {
    return this.service.list(getTenantContext().tenantId);
  }

  @Get('alerts')
  async alerts() {
    return this.service.getAlerts(getTenantContext().tenantId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const tooling = await this.service.getById(getTenantContext().tenantId, id);
    if (!tooling) throw new BadRequestException('Tooling not found.');
    return tooling;
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createToolingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.create(getTenantContext().tenantId, parsed.data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateToolingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.update(getTenantContext().tenantId, id, parsed.data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.service.delete(getTenantContext().tenantId, id);
    return { deleted: true };
  }

  @Post(':id/cycles')
  async incrementCycles(@Param('id') id: string, @Body('amount') amount: number) {
    if (!amount || amount <= 0) throw new BadRequestException('Amount must be a positive number.');
    return this.service.incrementCycles(getTenantContext().tenantId, id, amount);
  }

  @Post(':id/produce')
  async incrementByPieces(@Param('id') id: string, @Body('pieces') pieces: number) {
    if (!pieces || pieces <= 0) throw new BadRequestException('Pieces must be a positive number.');
    return this.service.incrementByPieces(getTenantContext().tenantId, id, pieces);
  }

  @Get('workstation/:workstationId')
  async getByWorkstation(@Param('workstationId') workstationId: string) {
    return this.service.getByWorkstation(getTenantContext().tenantId, workstationId);
  }
}
