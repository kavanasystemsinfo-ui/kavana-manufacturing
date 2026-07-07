import { Module } from '@nestjs/common';
import { CoreMesProductionController } from './core-mes-production.controller.js';
import { CoreMesProductionService } from './core-mes-production.service.js';

@Module({
  controllers: [CoreMesProductionController],
  providers: [CoreMesProductionService],
  exports: [CoreMesProductionService],
})
export class CoreMesProductionModule {}
