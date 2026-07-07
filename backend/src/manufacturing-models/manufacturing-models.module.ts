import { Module } from '@nestjs/common';
import { ManufacturingModelsController } from './manufacturing-models.controller.js';
import { ManufacturingModelsService } from './manufacturing-models.service.js';

@Module({
  controllers: [ManufacturingModelsController],
  providers: [ManufacturingModelsService],
  exports: [ManufacturingModelsService],
})
export class ManufacturingModelsModule {}
