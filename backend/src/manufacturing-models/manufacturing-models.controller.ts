import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Inject, UseGuards} from '@nestjs/common';
import { ManufacturingModelsService } from './manufacturing-models.service.js';
import { CreateManufacturingModelDtoSchema, UpdateManufacturingModelDtoSchema, type CreateManufacturingModelDto, type UpdateManufacturingModelDto } from './dto.js';

import { RequireRole } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

// Igual que en workstations: el supervisor necesita LEER el catálogo de modelos
// para crear una orden, pero definirlo y borrarlo es del administrador del tenant.
@Controller('manufacturing-models')
@UseGuards(RolesGuard)
export class ManufacturingModelsController {
  constructor(@Inject(ManufacturingModelsService) private readonly modelsService: ManufacturingModelsService) {}

  @Post()
  @RequireRole('tenant_admin')
  async createModel(@Body() body: CreateManufacturingModelDto) {
    const validated = CreateManufacturingModelDtoSchema.parse(body);
    return this.modelsService.createModel(validated);
  }

  @Get()
  @RequireRole('tenant_admin', 'supervisor')
  async listModels() {
    return this.modelsService.listModels();
  }

  @Get(':id')
  @RequireRole('tenant_admin', 'supervisor')
  async getModel(@Param('id') id: string) {
    const model = await this.modelsService.getModel(id);
    if (!model) {
      throw new NotFoundException(`Manufacturing model with id ${id} not found`);
    }
    return model;
  }

  @Put(':id')
  @RequireRole('tenant_admin')
  async updateModel(@Param('id') id: string, @Body() body: UpdateManufacturingModelDto) {
    const validated = UpdateManufacturingModelDtoSchema.parse(body);
    const model = await this.modelsService.updateModel(id, validated);
    if (!model) {
      throw new NotFoundException(`Manufacturing model with id ${id} not found`);
    }
    return model;
  }

  @Delete(':id')
  @RequireRole('tenant_admin')
  async deleteModel(@Param('id') id: string) {
    const deleted = await this.modelsService.deleteModel(id);
    if (!deleted) {
      throw new NotFoundException(`Manufacturing model with id ${id} not found`);
    }
    return { deleted: true };
  }
}
