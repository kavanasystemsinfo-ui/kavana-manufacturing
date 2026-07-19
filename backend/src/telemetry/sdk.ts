/**
 * OpenTelemetry SDK bootstrap — se ejecuta antes que NestJS.
 *
 * Dos modos:
 *   1. Prometheus local: define METRICS_PORT (ej: 9464) → endpoint /metrics en ese puerto.
 *   2. OTLP collector: define OTEL_EXPORTER_OTLP_ENDPOINT → exporta a Grafana Agent / Otel Collector.
 *
 * Si ninguna está definida, se ejecuta sin telemetría (sin overhead).
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// ── Métricas custom (singleton accesible desde cualquier módulo) ──
import { metrics } from '@opentelemetry/api';

export const meter = metrics.getMeter('kavana-manufacturing', '3.0.0');

/** Histograma de latencia por prompt LLM (ms) — etiquetas: provider, model */
export const llmPromptLatency = meter.createHistogram('llm_prompt_latency_ms', {
  description: 'Latencia de llamada al LLM en milisegundos',
  unit: 'ms',
});

/** Contador de tokens de entrada consumidos por provider/model */
export const llmPromptTokensIn = meter.createCounter('llm_prompt_tokens_in_total', {
  description: 'Total de tokens de entrada consumidos',
  unit: 'token',
});

/** Contador de tokens de salida generados por provider/model */
export const llmPromptTokensOut = meter.createCounter('llm_prompt_tokens_out_total', {
  description: 'Total de tokens de salida generados',
  unit: 'token',
});

/** Contador de prompts exitosos vs fallidos — etiquetas: provider, model, status */
export const llmPromptStatus = meter.createCounter('llm_prompt_status_total', {
  description: 'Contador de prompts por status (ok / error)',
});

// ── Init ──

let prometheus: PrometheusExporter | null = null;

export function getPrometheusPort(): number | null {
  return prometheus ? Number(process.env.METRICS_PORT ?? 9464) : null;
}

export async function initOtelSDK(): Promise<{ sdk: NodeSDK | null; mode: 'prometheus' | 'otlp' | 'off' }> {
  const metricsPort = parseInt(process.env.METRICS_PORT ?? '0', 10);
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  // ── Modo Prometheus (prioritario si está definido) ──
  if (metricsPort > 0) {
    console.log(`[telemetry] Modo Prometheus — /metrics en :${metricsPort}`);

    prometheus = new PrometheusExporter({
      port: metricsPort,
      endpoint: '/metrics',
    }, () => console.log(`[telemetry] Prometheus /metrics listo en :${metricsPort}`));

    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: 'kavana-manufacturing',
        [ATTR_SERVICE_VERSION]: '3.0.0',
      }),
      metricReader: prometheus,
    });

    await sdk.start();
    return { sdk, mode: 'prometheus' };
  }

  // ── Modo OTLP ──
  if (otlpEndpoint) {
    console.log(`[telemetry] Modo OTLP → ${otlpEndpoint}`);

    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: 'kavana-manufacturing',
        [ATTR_SERVICE_VERSION]: '3.0.0',
      }),
      traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
        exportIntervalMillis: 15_000,
      }),
    });

    await sdk.start();
    return { sdk, mode: 'otlp' };
  }

  // ── Off ──
  console.log('[telemetry] Sin telemetría (define METRICS_PORT o OTEL_EXPORTER_OTLP_ENDPOINT para activar)');
  return { sdk: null, mode: 'off' };
}
