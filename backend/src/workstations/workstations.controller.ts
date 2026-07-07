import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Inject } from '@nestjs/common';
import { WorkstationsService } from './workstations.service.js';
import { CreateWorkstationDtoSchema, UpdateWorkstationDtoSchema, type CreateWorkstationDto, type UpdateWorkstationDto } from './dto.js';

@Controller('workstations')
export class WorkstationsController {
  constructor(@Inject(WorkstationsService) private readonly workstationsService: WorkstationsService) {}

  @Post()
  async createWorkstation(@Body() body: CreateWorkstationDto) {
    const validated = CreateWorkstationDtoSchema.parse(body);
    return this.workstationsService.createWorkstation(validated);
  }

  @Get()
  async listWorkstations() {
    return this.workstationsService.listWorkstations();
  }

  @Get(':id')
  async getWorkstation(@Param('id') id: string) {
    const workstation = await this.workstationsService.getWorkstation(id);
    if (!workstation) {
      throw new NotFoundException(`Workstation with id ${id} not found`);
    }
    return workstation;
  }

  @Put(':id')
  async updateWorkstation(@Param('id') id: string, @Body() body: UpdateWorkstationDto) {
    const validated = UpdateWorkstationDtoSchema.parse(body);
    const workstation = await this.workstationsService.updateWorkstation(id, validated);
    if (!workstation) {
      throw new NotFoundException(`Workstation with id ${id} not found`);
    }
    return workstation;
  }

  @Delete(':id')
  async deleteWorkstation(@Param('id') id: string) {
    const deleted = await this.workstationsService.deleteWorkstation(id);
    if (!deleted) {
      throw new NotFoundException(`Workstation with id ${id} not found`);
    }
    return { deleted: true };
  }
}
