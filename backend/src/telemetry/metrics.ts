/**
 * Helpers para instrumentar prompts LLM con spans y métricas.
 *
 * Uso en cualquier servicio que llame a un LLM:
 *
 *   import { tracePrompt } from '../telemetry/metrics.js';
 *   const span = tracePrompt.start(context);
 *   try {
 *     const result = await callLLM(...);
 *     tracePrompt.ok(span, { tokensIn, tokensOut });
 *     return result;
 *   } catch (err) {
 *     tracePrompt.error(span, err);
 *     throw err;
 *   }
 */
import { trace, Span, SpanStatusCode } from '@opentelemetry/api';
import {
  llmPromptLatency,
  llmPromptTokensIn,
  llmPromptTokensOut,
  llmPromptStatus,
} from './sdk.js';

const tracer = trace.getTracer('kavana-manufacturing-ai', '3.0.0');

// ── Types ──

export interface TracePromptCtx {
  provider: string;
  model: string;
  question: string;
  context_chunks: number;
  tenant_id?: string;
}

export interface PromptMetrics {
  tokensIn: number;
  tokensOut: number;
  costCents?: number;
}

// ── Trace helpers ──

let promptSeq = 0;

export function tracePrompt(ctx: TracePromptCtx) {
  const seq = ++promptSeq;
  const startMs = Date.now();
  const attrs = {
    'llm.provider': ctx.provider,
    'llm.model': ctx.model,
    'llm.question_len': ctx.question.length,
    'llm.context_chunks': ctx.context_chunks,
    'tenant.id': ctx.tenant_id ?? 'unknown',
    'prompt.seq': seq,
  };

  const span = tracer.startSpan('llm.prompt', { attributes: attrs });

  /**
   * Registra éxito — debe llamarse después de que el LLM responda.
   * La latencia se mide desde tracePrompt.start() hasta aquí.
   */
  const ok = (metrics: PromptMetrics) => {
    const elapsedMs = Date.now() - startMs;
    span.setAttribute('llm.tokens_in', metrics.tokensIn);
    span.setAttribute('llm.tokens_out', metrics.tokensOut);
    span.setAttribute('llm.latency_ms', elapsedMs);
    if (metrics.costCents != null) span.setAttribute('llm.cost_cents', metrics.costCents);

    llmPromptLatency.record(elapsedMs, {
      provider: ctx.provider,
      model: ctx.model,
    });
    llmPromptTokensIn.add(metrics.tokensIn, {
      provider: ctx.provider,
      model: ctx.model,
    });
    llmPromptTokensOut.add(metrics.tokensOut, {
      provider: ctx.provider,
      model: ctx.model,
    });
    llmPromptStatus.add(1, {
      provider: ctx.provider,
      model: ctx.model,
      status: 'ok',
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  };

  /** Registra error — debe llamarse en el catch. */
  const error = (err: unknown) => {
    const elapsedMs = Date.now() - startMs;
    span.setAttribute('llm.latency_ms', elapsedMs);
    span.setAttribute('error', true);
    span.setAttribute('error.message', err instanceof Error ? err.message : String(err));
    span.recordException(err instanceof Error ? err : new Error(String(err)));
    span.setStatus({ code: SpanStatusCode.ERROR });

    llmPromptStatus.add(1, {
      provider: ctx.provider,
      model: ctx.model,
      status: 'error',
    });

    span.end();
  };

  return { span, ok, error };
}
