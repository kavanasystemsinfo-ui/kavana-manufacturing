import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, Inject } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service.js';
import { createIncidenciaSchema, updateIncidenciaSchema } from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';

@Controller('incidencias')
export class IncidenciasController {
  constructor(@Inject(IncidenciasService) private readonly service: IncidenciasService) {}

  @Get()
  async list() {
    return this.service.list(getTenantContext().tenantId);
  }

  @Get('stats')
  async stats() {
    return this.service.getStats(getTenantContext().tenantId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const incidencia = await this.service.getById(getTenantContext().tenantId, id);
    if (!incidencia) throw new BadRequestException('Incidencia not found.');
    return incidencia;
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createIncidenciaSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.create(getTenantContext().tenantId, parsed.data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateIncidenciaSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.update(getTenantContext().tenantId, id, parsed.data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.service.delete(getTenantContext().tenantId, id);
    return { deleted: true };
  }
}
