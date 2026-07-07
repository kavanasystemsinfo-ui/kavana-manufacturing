import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Inject } from '@nestjs/common';
import { ManufacturingModelsService } from './manufacturing-models.service.js';
import { CreateManufacturingModelDtoSchema, UpdateManufacturingModelDtoSchema, type CreateManufacturingModelDto, type UpdateManufacturingModelDto } from './dto.js';

@Controller('manufacturing-models')
export class ManufacturingModelsController {
  constructor(@Inject(ManufacturingModelsService) private readonly modelsService: ManufacturingModelsService) {}

  @Post()
  async createModel(@Body() body: CreateManufacturingModelDto) {
    const validated = CreateManufacturingModelDtoSchema.parse(body);
    return this.modelsService.createModel(validated);
  }

  @Get()
  async listModels() {
    return this.modelsService.listModels();
  }

  @Get(':id')
  async getModel(@Param('id') id: string) {
    const model = await this.modelsService.getModel(id);
    if (!model) {
      throw new NotFoundException(`Manufacturing model with id ${id} not found`);
    }
    return model;
  }

  @Put(':id')
  async updateModel(@Param('id') id: string, @Body() body: UpdateManufacturingModelDto) {
    const validated = UpdateManufacturingModelDtoSchema.parse(body);
    const model = await this.modelsService.updateModel(id, validated);
    if (!model) {
      throw new NotFoundException(`Manufacturing model with id ${id} not found`);
    }
    return model;
  }

  @Delete(':id')
  async deleteModel(@Param('id') id: string) {
    const deleted = await this.modelsService.deleteModel(id);
    if (!deleted) {
      throw new NotFoundException(`Manufacturing model with id ${id} not found`);
    }
    return { deleted: true };
  }
}
