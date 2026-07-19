import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { TenantContextMiddleware } from './auth/tenant-context.middleware.js';
import { CoreMesProductionModule } from './core-mes-production/core-mes-production.module.js';
import { TenantCapabilitiesModule } from './tenant-capabilities/tenant-capabilities.module.js';
import { UsersModule } from './users/users.module.js';
import { WorkstationsModule } from './workstations/workstations.module.js';
import { ManufacturingModelsModule } from './manufacturing-models/manufacturing-models.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { OeeModule } from './oee/oee.module.js';
import { QualityModule } from './quality/quality.module.js';
import { CostModule } from './cost/cost.module.js';
import { GlobalAdminModule } from './global-admin/global-admin.module.js';
import { AuthLoginModule } from './auth-login/auth-login.module.js';
import { AiAdvisorModule } from './ai-advisor/ai-advisor.module.js';

import { JwtServiceWrapper } from './auth/jwt.service.js';

@Module({
  imports: [TenantCapabilitiesModule, CoreMesProductionModule, UsersModule, WorkstationsModule, ManufacturingModelsModule, OrdersModule, OeeModule, QualityModule, CostModule, GlobalAdminModule, AuthLoginModule, AiAdvisorModule],
  controllers: [HealthController],
  providers: [JwtServiceWrapper],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes(
      'users',
      'workstations',
      'manufacturing-models',
      'orders',
      'oee',
      'quality',
      'costs',
      'tenant',
      'production',
      'ai-advisor',
    );
  }
}
