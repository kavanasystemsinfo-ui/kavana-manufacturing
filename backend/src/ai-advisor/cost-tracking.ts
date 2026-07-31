/**
 * Tracking de costes por prompt LLM.
 *
 * Calcula el coste estimado en centavos de USD basado en tokens y precios
 * públicos de cada provider/modelo. Se registra como atributo del span OTEL.
 *
 * Precios actualizados: Julio 2026.
 */
export interface ProviderPricing {
  /** Precio por 1M tokens de entrada (USD) */
  inputPerMTok: number;
  /** Precio por 1M tokens de salida (USD) */
  outputPerMTok: number;
}

const PRICING: Record<string, ProviderPricing> = {
  'meta/llama-3.1-8b-instruct': { inputPerMTok: 0.10, outputPerMTok: 0.10 },   // NVIDIA: $0.10/M
  'nvidia/llama-3.1-nemotron-70b-instruct': { inputPerMTok: 0.70, outputPerMTok: 0.70 },
  'mistralai/Mistral-7B-Instruct-v0.3': { inputPerMTok: 0.00, outputPerMTok: 0.00 }, // local (vLLM/Ollama)
  'llama3.1:8b': { inputPerMTok: 0.00, outputPerMTok: 0.00 },   // local (Ollama)
  'gpt-4o-mini': { inputPerMTok: 0.15, outputPerMTok: 0.60 },   // OpenAI
  'gpt-4o': { inputPerMTok: 2.50, outputPerMTok: 10.00 },
};

/**
 * Calcula coste estimado en centavos de USD.
 * Retorna 0 para modelos locales (Ollama/vLLM).
 */
export function estimateCostCents(
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const pricing = PRICING[model];
  if (!pricing || pricing.inputPerMTok === 0) return 0;

  const costIn = (tokensIn / 1_000_000) * pricing.inputPerMTok;
  const costOut = (tokensOut / 1_000_000) * pricing.outputPerMTok;
  return Math.round((costIn + costOut) * 100); // centavos
}

/**
 * Formatea coste para logging: "$0.0042" o "local (gratis)".
 */
export function formatCost(cents: number): string {
  if (cents === 0) return 'local (gratis)';
  return `$${(cents / 100).toFixed(4)}`;
}
