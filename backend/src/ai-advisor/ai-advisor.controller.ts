import { Controller, Post, Body, Logger, Req, Res } from '@nestjs/common';
import { AiAdvisorService } from './ai-advisor.service.js';
import { askAdvisorSchema } from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import type { Request, Response } from 'express';

// Límite 25 preguntas/día/IP (mismo patrón que RouteAI/Warehouse): la demo es
// pública y el reclutador pregunta sin login; el rate-limit controla el gasto.
const assistantLimits = new Map<string, { count: number; resetAt: number }>();

@Controller('ai-advisor')
export class AiAdvisorController {
  private readonly logger = new Logger(AiAdvisorController.name);

  constructor(private readonly advisor: AiAdvisorService) {}

  @Post('ask')
  async ask(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const parsed = askAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return res.status(400).json({ error: Object.values(firstError).flat()[0] || 'Datos inválidos', success: false });
    }

    // Rate limit por IP: 25 preguntas/día por visitante
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const limite = assistantLimits.get(ip);
    if (!limite || limite.resetAt < now) {
      assistantLimits.set(ip, { count: 1, resetAt: now + 24 * 3600 * 1000 });
    } else if (limite.count >= 25) {
      return res.status(429).json({ error: 'Has alcanzado el límite de preguntas de hoy (25). Vuelve mañana o pregúntale directamente a Jorge.' });
    } else {
      limite.count += 1;
    }

    const { question, context_filter } = parsed.data;
    const context = getTenantContext();

    this.logger.log(`Ask advisor: tenant=${context.tenantId} question="${question.slice(0, 60)}..."`);

    const result = await this.advisor.ask(question, context_filter);
    return res.json({ success: true, ...result });
  }
}
