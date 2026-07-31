import { Controller, Post, Body, Logger } from '@nestjs/common';
import { AiAdvisorService } from './ai-advisor.service.js';
import { askAdvisorSchema } from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';

@Controller('ai-advisor')
export class AiAdvisorController {
  private readonly logger = new Logger(AiAdvisorController.name);

  constructor(private readonly advisor: AiAdvisorService) {}

  @Post('ask')
  async ask(@Body() body: unknown) {
    const parsed = askAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return { error: Object.values(firstError).flat()[0] || 'Datos inválidos', success: false };
    }

    const { question, context_filter } = parsed.data;
    const context = getTenantContext();

    this.logger.log(`Ask advisor: tenant=${context.tenantId} question="${question.slice(0, 60)}..."`);

    const result = await this.advisor.ask(question, context_filter);
    return { success: true, ...result };
  }
}
