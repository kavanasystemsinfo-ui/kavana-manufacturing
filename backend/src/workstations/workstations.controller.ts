import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Inject, UseGuards} from '@nestjs/common';
import { WorkstationsService } from './workstations.service.js';
import { CreateWorkstationDtoSchema, UpdateWorkstationDtoSchema, type CreateWorkstationDto, type UpdateWorkstationDto } from './dto.js';

import { RequireRole } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

// Los roles van por método y no en la clase: el supervisor necesita leer y crear
// puestos (es quien monta la línea y crea las órdenes, ver el flujo vertical del
// roadmap), pero borrar un puesto sigue siendo cosa del administrador del tenant.
// Con el rol en la clase, el panel del supervisor recibía 403 al pedir el catálogo
// y su formulario de nueva orden salía sin opciones que elegir.
@Controller('workstations')
@UseGuards(RolesGuard)
export class WorkstationsController {
  constructor(@Inject(WorkstationsService) private readonly workstationsService: WorkstationsService) {}

  @Post()
  @RequireRole('tenant_admin', 'supervisor')
  async createWorkstation(@Body() body: CreateWorkstationDto) {
    const validated = CreateWorkstationDtoSchema.parse(body);
    return this.workstationsService.createWorkstation(validated);
  }

  @Get()
  @RequireRole('tenant_admin', 'supervisor')
  async listWorkstations() {
    return this.workstationsService.listWorkstations();
  }

  @Get(':id')
  @RequireRole('tenant_admin', 'supervisor')
  async getWorkstation(@Param('id') id: string) {
    const workstation = await this.workstationsService.getWorkstation(id);
    if (!workstation) {
      throw new NotFoundException(`Workstation with id ${id} not found`);
    }
    return workstation;
  }

  @Put(':id')
  @RequireRole('tenant_admin', 'supervisor')
  async updateWorkstation(@Param('id') id: string, @Body() body: UpdateWorkstationDto) {
    const validated = UpdateWorkstationDtoSchema.parse(body);
    const workstation = await this.workstationsService.updateWorkstation(id, validated);
    if (!workstation) {
      throw new NotFoundException(`Workstation with id ${id} not found`);
    }
    return workstation;
  }

  @Delete(':id')
  @RequireRole('tenant_admin')
  async deleteWorkstation(@Param('id') id: string) {
    const deleted = await this.workstationsService.deleteWorkstation(id);
    if (!deleted) {
      throw new NotFoundException(`Workstation with id ${id} not found`);
    }
    return { deleted: true };
  }
}
