import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RequireFeature } from '../tenant-capabilities/require-feature.decorator.js';
import { QualityService } from './quality.service.js';

@Controller('quality')
@RequireFeature('quality_assurance')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Post('checks')
  async createCheck(
    @Body() body: { order_id: string; workstation_id: string; result: 'pass' | 'fail' | 'conditional'; defect_count: number; defect_type?: string; notes?: string },
  ) {
    return this.qualityService.createCheck(
      body.order_id,
      body.workstation_id,
      body.result,
      body.defect_count,
      body.defect_type,
      body.notes,
    );
  }

  @Get('orders/:orderId/checks')
  async listChecks(@Param('orderId') orderId: string) {
    return this.qualityService.listChecks(orderId);
  }

  @Get('orders/:orderId/summary')
  async getSummary(@Param('orderId') orderId: string) {
    return this.qualityService.getSummary(orderId);
  }
}
