// Política Kavana (T-061): los chatbots públicos solo usan modelos gratuitos de
// OpenRouter (sufijo ":free"), con varios de respaldo, para no consumir saldo.
// Misma lista que el panel de ODOO_CRM (probada el 2026-11-10).
export const MODELOS_GRATIS_POR_DEFECTO = [
  'cohere/north-mini-code:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
];

export const MAX_MODELOS_POR_PREGUNTA = 3;

export function esOpenRouter(baseUrl: string): boolean {
  return baseUrl.includes('openrouter.ai');
}

// Devuelve los candidatos configurados que sean gratuitos, seguidos de los de
// por defecto, sin duplicados y con un máximo. Descarta cualquier modelo de pago.
export function modelosGratis(...candidatos: Array<string | undefined>): string[] {
  const vistos = new Set<string>();
  const lista: string[] = [];
  for (const m of [...candidatos, ...MODELOS_GRATIS_POR_DEFECTO]) {
    const nombre = (m || '').trim();
    if (!nombre.endsWith(':free') || vistos.has(nombre)) continue;
    vistos.add(nombre);
    lista.push(nombre);
  }
  return lista.slice(0, MAX_MODELOS_POR_PREGUNTA);
}
