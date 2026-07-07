import { Module } from '@nestjs/common';
import { WorkstationsController } from './workstations.controller.js';
import { WorkstationsService } from './workstations.service.js';

@Module({
  controllers: [WorkstationsController],
  providers: [WorkstationsService],
  exports: [WorkstationsService],
})
export class WorkstationsModule {}
