export interface CustomFieldDraft {
  key: string;
  label: string;
  type: string;
  required: boolean;
  /** Solo para el tipo 'select'. */
  options?: string[];
}

/** Nombres de tipo tal como los ve el admin, sin jerga técnica. */
export const FIELD_TYPE_LABELS: Record<string, string> = {
  string: 'Texto',
  number: 'Número',
  boolean: 'Sí/No',
  select: 'Lista de opciones',
  date: 'Fecha',
};

/** Orden en el que se ofrecen los tipos en el desplegable. */
export const FIELD_TYPE_ORDER = ['string', 'number', 'boolean', 'select', 'date'] as const;

const KEY_PATTERN = /^[a-z0-9_-]+$/;

/**
 * Convierte un nombre legible en una llave válida.
 *
 * El backend solo acepta minúsculas, números, guion y guion bajo, así que el
 * formulario propone la llave ya normalizada en vez de dejar que el admin
 * escriba "Nº de Lote" y se coma un error al guardar.
 */
export function normalizeFieldKey(raw: string): string {
  return (raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Revisa el borrador antes de guardarlo y devuelve todos los problemas que
 * encuentra, no solo el primero: el admin quiere arreglarlos de una pasada.
 *
 * Las reglas son las mismas que aplica el backend, para que un esquema que
 * pasa aquí nunca acabe en un 400 al guardar.
 */
export function validateCustomFieldsDraft(fields: CustomFieldDraft[]): string[] {
  const errors: string[] = [];
  const seenKeys = new Map<string, number>();

  fields.forEach((field, index) => {
    const fila = `fila ${index + 1}`;
    const key = (field.key ?? '').trim();

    if (!key) {
      errors.push(`La ${fila} no tiene llave.`);
    } else if (!KEY_PATTERN.test(key)) {
      errors.push(`La llave de la ${fila} ("${key}") solo admite minúsculas, números, guiones y guiones bajos.`);
    } else if (seenKeys.has(key)) {
      errors.push(`La llave "${key}" está duplicada (${fila}).`);
    } else {
      seenKeys.set(key, index);
    }

    if (field.type === 'select') {
      const rawOptions = field.options ?? [];
      const blankCount = rawOptions.filter((option) => !(option ?? '').trim()).length;
      const options = rawOptions.map((option) => (option ?? '').trim()).filter(Boolean);

      if (options.length === 0) {
        errors.push(`El campo "${key || fila}" es una lista y necesita al menos una opción.`);
      } else if (blankCount > 0) {
        // El backend rechaza una opción vacía (min(1) tras recortar), así que
        // aquí se avisa en vez de descartarla en silencio y comerse un 400.
        errors.push(`El campo "${key || fila}" tiene una opción en blanco.`);
      } else if (new Set(options).size !== options.length) {
        errors.push(`El campo "${key || fila}" tiene opciones repetidas.`);
      }
    }
  });

  return errors;
}
