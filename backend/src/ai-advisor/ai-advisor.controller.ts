import { Controller, Post, Body, Logger, Req, Res } from '@nestjs/common';
import { AiAdvisorService } from './ai-advisor.service.js';
import { TechnicalAdvisorService } from './technical-advisor.service.js';
import { askAdvisorSchema } from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import type { Request, Response } from 'express';

// Límite 25 preguntas/día/IP (mismo patrón que RouteAI/Warehouse): la demo es
// pública y el reclutador pregunta sin login; el rate-limit controla el gasto.
const assistantLimits = new Map<string, { count: number; resetAt: number }>();

// Comprobar y consumir el rate-limit por IP. Devuelve null si hay cupo.
function checkRateLimit(req: Request): string | null {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const limite = assistantLimits.get(ip);
  if (!limite || limite.resetAt < now) {
    assistantLimits.set(ip, { count: 1, resetAt: now + 24 * 3600 * 1000 });
    return null;
  }
  if (limite.count >= 25) {
    return 'Has alcanzado el límite de preguntas de hoy (25). Vuelve mañana o pregúntale directamente a Jorge.';
  }
  limite.count += 1;
  return null;
}

@Controller('ai-advisor')
export class AiAdvisorController {
  private readonly logger = new Logger(AiAdvisorController.name);

  constructor(
    private readonly advisor: AiAdvisorService,
    private readonly technicalAdvisor: TechnicalAdvisorService,
  ) {}

  @Post('ask')
  async ask(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const parsed = askAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return res.status(400).json({ error: Object.values(firstError).flat()[0] || 'Datos inválidos', success: false });
    }

    const rateError = checkRateLimit(req);
    if (rateError) {
      return res.status(429).json({ error: rateError });
    }

    const { question, context_filter } = parsed.data;
    const context = getTenantContext();

    this.logger.log(`Ask advisor (MES): tenant=${context.tenantId} question="${question.slice(0, 60)}..."`);

    const result = await this.advisor.ask(question, context_filter);
    return res.json({ success: true, ...result });
  }

  // Asistente TÉCNICO: RAG sobre la documentación del repo (README, DECISIONS,
  // ADRs, docs técnicos). Funciona sin token (demo pública) igual que /ask.
  @Post('ask-tech')
  async askTech(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const parsed = askAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return res.status(400).json({ error: Object.values(firstError).flat()[0] || 'Datos inválidos', success: false });
    }

    const rateError = checkRateLimit(req);
    if (rateError) {
      return res.status(429).json({ error: rateError });
    }

    const { question } = parsed.data;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Asistente no configurado (falta OPENROUTER_API_KEY en el servidor)' });
    }

    this.logger.log(`Ask advisor (TÉCNICO): question="${question.slice(0, 60)}..."`);

    const result = await this.technicalAdvisor.responder(apiKey, question);
    return res.json({ success: true, ...result });
  }
}
