/**
 * OpenTelemetry SDK bootstrap — se ejecuta antes que NestJS.
 *
 * Trazas HTTP/Express automáticas + métricas custom para LLM.
 * Export: OTLP collector (configurable) o stdout como fallback.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader, MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// ── Métricas custom (singleton accesible desde cualquier módulo) ──
import { metrics } from '@opentelemetry/api';

export const meter = metrics.getMeter('kavana-manufacturing', '3.0.0');

/** Histograma de latencia por prompt LLM (ms) — etiquetas: provider, model */
export const llmPromptLatency = meter.createHistogram('llm.prompt.latency_ms', {
  description: 'Latencia de llamada al LLM en milisegundos',
  unit: 'ms',
});

/** Contador de tokens de entrada consumidos por provider/model */
export const llmPromptTokensIn = meter.createCounter('llm.prompt.tokens_in', {
  description: 'Total de tokens de entrada consumidos',
  unit: '{token}',
});

/** Contador de tokens de salida generados por provider/model */
export const llmPromptTokensOut = meter.createCounter('llm.prompt.tokens_out', {
  description: 'Total de tokens de salida generados',
  unit: '{token}',
});

/** Contador de prompts exitosos vs fallidos — etiquetas: provider, model, status */
export const llmPromptStatus = meter.createCounter('llm.prompt.status', {
  description: 'Contador de prompts por status (ok / error)',
});

// ── Init ──
export async function initOtelSDK(): Promise<NodeSDK | null> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!endpoint) {
    console.log('[telemetry] OTEL_EXPORTER_OTLP_ENDPOINT no definido — ejecutando sin telemetría');
    return null;
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'kavana-manufacturing',
    [ATTR_SERVICE_VERSION]: '3.0.0',
  });

  const sdk = new NodeSDK({
    resource,
    spanProcessors: [],
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
      exportIntervalMillis: 15_000,
    }),
  });

  await sdk.start();
  console.log(`[telemetry] OpenTelemetry iniciado → ${endpoint}`);
  return sdk;
}
