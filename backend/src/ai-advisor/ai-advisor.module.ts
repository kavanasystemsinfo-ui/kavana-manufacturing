import { Module } from '@nestjs/common';
import { AiAdvisorController } from './ai-advisor.controller.js';
import { AiAdvisorService } from './ai-advisor.service.js';

@Module({
  controllers: [AiAdvisorController],
  providers: [AiAdvisorService],
})
export class AiAdvisorModule {}
