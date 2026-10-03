import { Controller, Get, Post, Body, Param, UseGuards} from '@nestjs/common';
import { RequireFeature } from '../tenant-capabilities/require-feature.decorator.js';
import { CostService } from './cost.service.js';

import { RequireRole } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Controller('costs')
@UseGuards(RolesGuard)
@RequireFeature('cost_management')
export class CostController {
  constructor(private readonly costService: CostService) {}

  @Post('entries')
  @RequireRole('tenant_admin')
  async createEntry(
    @Body() body: { order_id: string; category: 'material' | 'labor' | 'overhead' | 'energy'; amount: number; currency: string; description?: string },
  ) {
    return this.costService.createEntry(
      body.order_id,
      body.category,
      body.amount,
      body.currency,
      body.description,
    );
  }

  @Get('orders/:orderId/entries')
  @RequireRole('supervisor', 'tenant_admin')
  async listEntries(@Param('orderId') orderId: string) {
    return this.costService.listEntries(orderId);
  }

  @Get('orders/:orderId/summary')
  @RequireRole('supervisor', 'tenant_admin')
  async getSummary(@Param('orderId') orderId: string) {
    return this.costService.getSummary(orderId);
  }
}
