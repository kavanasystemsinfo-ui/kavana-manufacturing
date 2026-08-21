import { Module } from '@nestjs/common';
import { CoreMesProductionController } from './core-mes-production.controller.js';
import { CoreMesProductionService } from './core-mes-production.service.js';
import { TenantCapabilitiesModule } from '../tenant-capabilities/tenant-capabilities.module.js';

@Module({
  // FIX 2026-08-21 (ronda 2): el service inyecta TenantCapabilitiesService
  // pero el módulo no importaba TenantCapabilitiesModule → el backend no
  // arrancaba (UnknownDependenciesException). Los tests no lo pillaban
  // porque mockean el service. Regresión DI detectada por la auditoría
  // adversarial (el atacante no pudo arrancar el servidor en HEAD).
  imports: [TenantCapabilitiesModule],
  controllers: [CoreMesProductionController],
  providers: [CoreMesProductionService],
  exports: [CoreMesProductionService],
})
export class CoreMesProductionModule {}
