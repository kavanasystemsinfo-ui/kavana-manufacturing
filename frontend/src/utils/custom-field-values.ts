export type FieldInputType = 'text' | 'number' | 'checkbox' | 'select' | 'date';

const INPUT_TYPES: Record<string, FieldInputType> = {
  string: 'text',
  number: 'number',
  boolean: 'checkbox',
  select: 'select',
  date: 'date',
};

/** Control con el que se rellena un campo. Un tipo desconocido cae a texto. */
export function inputTypeForField(type: string): FieldInputType {
  return INPUT_TYPES[type] ?? 'text';
}

/**
 * Convierte lo que devuelve el control del formulario al valor que se guarda.
 *
 * Los inputs del navegador dan siempre texto, así que sin esto un número se
 * guardaría como "3" y el backend lo rechazaría por no ser un número. Y un
 * campo vacío devuelve undefined en lugar de cadena vacía: "no lo he rellenado"
 * no es lo mismo que "lo he dejado en blanco".
 */
export function coerceFieldValue(type: string, raw: unknown): unknown {
  if (type === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return undefined;
  }

  const texto = typeof raw === 'string' ? raw.trim() : raw === null || raw === undefined ? '' : String(raw).trim();
  if (texto === '') return undefined;

  if (type === 'number') {
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : undefined;
  }

  return texto;
}

/** Estado inicial del formulario a partir de lo que ya tiene la orden. */
export function buildDraftValues(
  fields: Array<{ key: string }>,
  current: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const draft: Record<string, unknown> = {};
  for (const field of fields) {
    const valor = current?.[field.key];
    if (typeof valor === 'boolean') draft[field.key] = valor;
    else if (valor === null || valor === undefined) draft[field.key] = '';
    else draft[field.key] = String(valor);
  }
  return draft;
}

/**
 * Del formulario al cuerpo que espera el backend.
 *
 * Los campos que se quedan vacíos no se envían: el esquema del backend es
 * estricto con los campos declarados, pero mandar undefined no aporta nada y
 * ensucia el JSON que se guarda.
 */
export function buildPayload(
  fields: Array<{ key: string; type: string }>,
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const valor = coerceFieldValue(field.type, draft[field.key]);
    if (valor !== undefined) payload[field.key] = valor;
  }
  return payload;
}
