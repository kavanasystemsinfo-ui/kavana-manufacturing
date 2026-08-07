import { Module } from '@nestjs/common';
import { AiAdvisorController } from './ai-advisor.controller.js';
import { AiAdvisorService } from './ai-advisor.service.js';
import { TechnicalAdvisorService } from './technical-advisor.service.js';

@Module({
  controllers: [AiAdvisorController],
  providers: [AiAdvisorService, TechnicalAdvisorService],
})
export class AiAdvisorModule {}
