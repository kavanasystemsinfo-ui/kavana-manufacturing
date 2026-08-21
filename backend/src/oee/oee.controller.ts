import { Controller, Get, Param, Query, UseGuards} from '@nestjs/common';
import { RequireFeature } from '../tenant-capabilities/require-feature.decorator.js';
import { OeeService } from './oee.service.js';

import { RequireRole } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Controller('oee')
@RequireRole('operario', 'supervisor', 'tenant_admin')
@UseGuards(RolesGuard)
@RequireFeature('oee_monitoring')
export class OeeController {
  constructor(private readonly oeeService: OeeService) {}

  @Get('workstation/:workstationId')
  async getOeeSummary(
    @Param('workstationId') workstationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.oeeService.getOeeSummary(workstationId, startDate, endDate);
  }

  @Get('workstations')
  async getOeeByWorkstation(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.oeeService.getOeeByWorkstation(startDate, endDate);
  }

  @Get('workstation/:workstationId/downtime')
  async getDowntimeBreakdown(
    @Param('workstationId') workstationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.oeeService.getDowntimeBreakdown(workstationId, startDate, endDate);
  }
}
