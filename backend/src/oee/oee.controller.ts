import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequireFeature } from '../tenant-capabilities/require-feature.decorator.js';
import { OeeService } from './oee.service.js';

@Controller('oee')
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
