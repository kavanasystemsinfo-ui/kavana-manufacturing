import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { MaterialsService } from './materials.service.js';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  // ─── Raw Materials CRUD ───
  @Get()
  async list() {
    const ctx = getTenantContext();
    return this.service.listMaterials(ctx.tenantId);
  }

  @Post()
  async create(@Body() body: any) {
    const ctx = getTenantContext();
    return this.service.createMaterial(ctx.tenantId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const ctx = getTenantContext();
    return this.service.updateMaterial(ctx.tenantId, id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const ctx = getTenantContext();
    return this.service.deleteMaterial(ctx.tenantId, id);
  }

  // ─── BOM ───
  @Get('bom/:modelId')
  async getBom(@Param('modelId') modelId: string) {
    const ctx = getTenantContext();
    return this.service.getBomForModel(ctx.tenantId, modelId);
  }

  @Get('bom')
  async getAllBom() {
    const ctx = getTenantContext();
    return this.service.getAllBom(ctx.tenantId);
  }

  @Post('bom')
  async upsertBom(@Body() body: any) {
    const ctx = getTenantContext();
    return this.service.upsertBomItem(ctx.tenantId, body);
  }

  @Delete('bom/:id')
  async deleteBom(@Param('id') id: string) {
    const ctx = getTenantContext();
    return this.service.deleteBomItem(ctx.tenantId, id);
  }

  // ─── Models by workstation (for supervisor order creation) ───
  @Get('by-workstation/:wsId')
  async getByWorkstation(@Param('wsId') wsId: string) {
    const ctx = getTenantContext();
    return this.service.getModelsByWorkstation(ctx.tenantId, wsId);
  }
}
