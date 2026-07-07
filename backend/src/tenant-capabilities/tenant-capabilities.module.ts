import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TenantCapabilitiesController } from './tenant-capabilities.controller.js';
import { TenantCapabilitiesService } from './tenant-capabilities.service.js';
import { RequireFeatureGuard } from './require-feature.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Global()
@Module({
  controllers: [TenantCapabilitiesController],
  providers: [
    TenantCapabilitiesService,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: RequireFeatureGuard,
    },
  ],
  exports: [TenantCapabilitiesService],
})
export class TenantCapabilitiesModule {}
