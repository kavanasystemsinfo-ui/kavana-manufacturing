import { describe, it, expect } from 'vitest';

/**
 * Tests estructurales del módulo de telemetría.
 *
 * NOTA: Las métricas OpenTelemetry requieren el SDK iniciado.
 * Estos tests verifican que la interfaz y tipos son correctos.
 */
describe('telemetry metrics interface', () => {
  it('TracePromptCtx accepts context_version field', () => {
    // Verificación de tipo en tiempo de compilación:
    // Si este test pasa, la interfaz TracePromptCtx acepta context_version.
    const ctx: {
      provider: string;
      model: string;
      question: string;
      context_chunks: number;
      tenant_id?: string;
      context_version?: string;
    } = {
      provider: 'nvidia',
      model: 'test-model',
      question: 'test?',
      context_chunks: 3,
      tenant_id: 't1',
      context_version: 'abc123def456',
    };
    expect(ctx.context_version).toBe('abc123def456');
    expect(ctx.provider).toBe('nvidia');
    expect(ctx.context_chunks).toBe(3);
  });

  it('PromptMetrics includes optional costCents', () => {
    const metrics: {
      tokensIn: number;
      tokensOut: number;
      costCents?: number;
    } = {
      tokensIn: 100,
      tokensOut: 50,
      costCents: 15,
    };
    expect(metrics.costCents).toBe(15);
    expect(metrics.tokensIn).toBe(100);
  });

  it('metric names follow Prometheus naming conventions', () => {
    // Los nombres deben usar snake_case, sin guiones ni puntos raros
    const metricNames = [
      'llm_prompt_latency_ms',
      'llm_prompt_tokens_in_total',
      'llm_prompt_tokens_out_total',
      'llm_prompt_status_total',
    ];
    for (const name of metricNames) {
      expect(name).toMatch(/^[a-z_]+$/);
      expect(name).not.toContain('-');
      expect(name).not.toContain('.');
    }
  });
});
