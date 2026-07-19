import { Injectable, Logger } from '@nestjs/common';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import { tracePrompt } from '../telemetry/metrics.js';

interface ContextBundle {
  orders: string;
  models: string;
  oee: string;
  quality: string;
  workblocks: string;
}

@Injectable()
export class AiAdvisorService {
  private readonly logger = new Logger(AiAdvisorService.name);

  async ask(question: string, contextFilter?: { order_id?: string; workstation_id?: string; model_id?: string }): Promise<{ answer: string; engine: string }> {
    const context = getTenantContext();
    const startTime = Date.now();

    // 1. Gather context from manufacturing data
    const bundle = await this.gatherContext(context.tenantId, contextFilter);

    // 2. Build prompt with grounded context
    const prompt = this.buildPrompt(question, bundle);

    // 3. Call LLM
    try {
      const answer = await this.callLLM(prompt);
      const latency = Date.now() - startTime;
      this.logger.log(`AI advisor: ${question.slice(0, 50)}... (${latency}ms, tenant ${context.tenantId})`);
      return { answer, engine: 'openrouter' };
    } catch (err) {
      this.logger.warn(`AI advisor fallback (LLM error): ${err instanceof Error ? err.message : String(err)}`);
      return {
        answer: 'No pude consultar el asistente IA en este momento. Verifica la conexión con OpenRouter e inténtalo de nuevo.',
        engine: 'offline',
      };
    }
  }

  private async gatherContext(tenantId: string, filter?: { order_id?: string; workstation_id?: string; model_id?: string }): Promise<ContextBundle> {
    const pool = postgresPool;

    // Orders context
    const orders = await tenantQuery(
      pool,
      `SELECT o.id, o.code, o.status, o.quantity, o.produced_quantity, o.defect_quantity,
              o.created_at, o.updated_at,
              COALESCE(mm.name, 'sin modelo') as model_name,
              COALESCE(w.name, 'sin puesto') as workstation_name
       FROM orders o
       LEFT JOIN manufacturing_models mm ON mm.tenant_id = o.tenant_id AND mm.id = o.model_id
       LEFT JOIN workstations w ON w.tenant_id = o.tenant_id AND w.id = o.workstation_id
       WHERE o.tenant_id = get_current_tenant()
       ${filter?.order_id ? 'AND o.id = $1' : ''}
       ORDER BY o.created_at DESC LIMIT 10`,
      filter?.order_id ? [filter.order_id] : [],
    );

    // Manufacturing models
    const models = await tenantQuery(
      pool,
      `SELECT id, name, unit_of_measure, target_rate
       FROM manufacturing_models
       WHERE tenant_id = get_current_tenant()
       ${filter?.model_id ? 'AND id = $1' : ''}
       ORDER BY name`,
      filter?.model_id ? [filter.model_id] : [],
    );

    // OEE summary
    const oee = await tenantQuery(
      pool,
      `SELECT ws.name as workstation_name,
              ws.id as workstation_id,
              COALESCE(AVG(wh.availability), 0) as availability,
              COALESCE(AVG(wh.performance), 0) as performance,
              COALESCE(AVG(wh.quality), 0) as quality,
              COALESCE(AVG(wh.oee), 0) as oee
       FROM oee_metrics wh
       JOIN workstations ws ON ws.tenant_id = wh.tenant_id AND ws.id = wh.workstation_id
       WHERE wh.tenant_id = get_current_tenant()
         AND wh.period_start >= NOW() - INTERVAL '7 days'
       ${filter?.workstation_id ? 'AND wh.workstation_id = $1' : ''}
       GROUP BY ws.name, ws.id
       ORDER BY ws.name`,
      filter?.workstation_id ? [filter.workstation_id] : [],
    );

    // Quality issues
    const quality = await tenantQuery(
      pool,
      `SELECT qc.id, qc.order_id, qc.defect_type, qc.quantity, qc.notes, qc.created_at,
              o.code as order_code
       FROM quality_checks qc
       JOIN orders o ON o.tenant_id = qc.tenant_id AND o.id = qc.order_id
       WHERE qc.tenant_id = get_current_tenant()
         AND qc.created_at >= NOW() - INTERVAL '7 days'
       ORDER BY qc.created_at DESC LIMIT 10`,
    );

    // Recent work blocks
    const workblocks = await tenantQuery(
      pool,
      `SELECT wb.id, wb.type, wb.start_time, wb.end_time, wb.downtime_reason,
              wb.produced_quantity, wb.defect_quantity,
              ws.name as workstation_name,
              o.code as order_code
       FROM production_work_blocks wb
       JOIN workstations ws ON ws.tenant_id = wb.tenant_id AND ws.id = wb.workstation_id
       JOIN orders o ON o.tenant_id = wb.tenant_id AND o.id = wb.order_id
       WHERE wb.tenant_id = get_current_tenant()
         AND wb.start_time >= NOW() - INTERVAL '7 days'
       ORDER BY wb.start_time DESC LIMIT 15`,
    );

    return {
      orders: JSON.stringify(orders.rows, null, 2),
      models: JSON.stringify(models.rows, null, 2),
      oee: JSON.stringify(oee.rows, null, 2),
      quality: JSON.stringify(quality.rows, null, 2),
      workblocks: JSON.stringify(workblocks.rows, null, 2),
    };
  }

  private buildPrompt(question: string, ctx: ContextBundle): string {
    return [
      'Eres un advisor técnico especializado en manufactura industrial.',
      'Formas parte del sistema MES Kavana Manufacturing.',
      '',
      'REGLAS:',
      '1. Responde SIEMPRE basándote ÚNICAMENTE en los datos de producción proporcionados abajo.',
      '2. Si los datos no contienen suficiente información para responder, di exactamente eso.',
      '3. Usa lenguaje claro que un operario de planta o supervisor entienda.',
      '4. Cuando sea relevante, incluye datos numéricos concretos de las órdenes, OEE o calidad.',
      '5. Si la pregunta sugiere un problema, ofrece causas posibles y pasos de acción.',
      '6. Responde en español.',
      '',
      '=== DATOS DE PRODUCCIÓN (contexto) ===',
      '',
      '--- Órdenes activas/recientes ---',
      ctx.orders,
      '',
      '--- Modelos de fabricación ---',
      ctx.models,
      '',
      '--- OEE por puesto (últimos 7 días) ---',
      ctx.oee,
      '',
      '--- Incidencias de calidad (últimos 7 días) ---',
      ctx.quality,
      '',
      '--- Bloques de trabajo (últimos 7 días) ---',
      ctx.workblocks,
      '',
      '=== PREGUNTA DEL OPERARIO ===',
      question,
    ].join('\n');
  }

  private async callLLM(prompt: string): Promise<string> {
    // Provider selection: nvidia, openrouter, or openai
    const provider = (process.env.LLM_PROVIDER || 'openrouter').toLowerCase();
    const apiKey = process.env[provider === 'nvidia' ? 'NVIDIA_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : 'OPENROUTER_API_KEY']
      || process.env.OPENROUTER_API_KEY
      || process.env.OPENAI_API_KEY;

    const baseUrl = process.env.LLM_BASE_URL || {
      nvidia: 'https://integrate.api.nvidia.com/v1',
      openrouter: 'https://openrouter.ai/api/v1',
      openai: 'https://api.openai.com/v1',
    }[provider] || 'https://openrouter.ai/api/v1';

    const model = process.env.LLM_MODEL || {
      nvidia: 'meta/llama-3.1-8b-instruct',
      openrouter: 'gpt-4o-mini',
      openai: 'gpt-4o-mini',
    }[provider] || 'gpt-4o-mini';

    if (!apiKey) {
      throw new Error(`API key no configurada para provider "${provider}". Configura ${provider.toUpperCase()}_API_KEY en .env`);
    }

    // ── OpenTelemetry: trace + métricas de este prompt ──
    const ctx = getTenantContext();
    const ctxChunks = (prompt.match(/\n--- /g) || []).length;
    const tp = tracePrompt({
      provider,
      model,
      question: prompt.split('=== PREGUNTA DEL OPERARIO ===')[1]?.trim() || prompt.slice(0, 200),
      context_chunks: ctxChunks,
      tenant_id: ctx.tenantId,
    });

    try {
      const { default: openai } = await import('openai');
      const client = new openai.OpenAI({ apiKey, baseUrl });

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: prompt.split('=== PREGUNTA DEL OPERARIO ===')[0] },
          { role: 'user', content: prompt.split('=== PREGUNTA DEL OPERARIO ===')[1] || prompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
      });

      const answer = response.choices[0]?.message?.content || 'No se pudo generar una respuesta.';

      tp.ok({
        tokensIn: response.usage?.prompt_tokens ?? 0,
        tokensOut: response.usage?.completion_tokens ?? 0,
      });

      return answer;
    } catch (err) {
      tp.error(err);
      throw err;
    }
  }
}
