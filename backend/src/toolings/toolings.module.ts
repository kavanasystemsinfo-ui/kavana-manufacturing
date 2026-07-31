import { Module } from '@nestjs/common';
import { ToolingsController } from './toolings.controller.js';
import { ToolingsService } from './toolings.service.js';

@Module({
  controllers: [ToolingsController],
  providers: [ToolingsService],
})
export class ToolingsModule {}
