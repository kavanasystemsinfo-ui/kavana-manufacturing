import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TenantCapabilitiesController } from './tenant-capabilities.controller.js';
import { TenantCapabilitiesService } from './tenant-capabilities.service.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RequireFeatureGuard } from './require-feature.guard.js';

@Module({
  controllers: [TenantCapabilitiesController],
  providers: [
    TenantCapabilitiesService,
    RolesGuard,
    // FIX 2026-08-21 (P0): RolesGuard global y fail-closed. Antes solo
    // RequireFeatureGuard era APP_GUARD; RolesGuard solo actuaba donde había
    // @UseGuards explícito, dejando /users y /global-admin sin protección.
    // Orden: RolesGuard primero (roles), luego RequireFeatureGuard (licencia).
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_GUARD,
      useClass: RequireFeatureGuard,
    },
  ],
  exports: [TenantCapabilitiesService],
})
export class TenantCapabilitiesModule {}
