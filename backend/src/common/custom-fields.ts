import { z } from 'zod';

/** Tipos que ofrece el constructor visual de campos personalizados. */
export const CUSTOM_FIELD_TYPES = ['string', 'number', 'boolean', 'select', 'date'] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldDefinition {
  key: string;
  label?: string;
  type: string;
  required?: boolean;
  options?: string[];
}

/**
 * Convierte un nombre legible en una llave válida: minúsculas, sin acentos,
 * solo letras/números/guion y sin guiones sobrantes en los extremos.
 *
 * Devolver cadena vacía cuando no queda nada válido es intencionado: así la
 * validación lo detecta y se lo dice al usuario, en vez de guardar una llave
 * inventada que luego nadie reconoce.
 */
export function normalizeFieldKey(raw: string): string {
  return (raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validación del esquema que propone el admin al guardar.
 *
 * Vive aquí, junto al constructor del esquema de validación de órdenes, para
 * que lo que se puede guardar y lo que luego se acepta en una orden sean la
 * misma definición: si un tipo no está aquí, tampoco se puede guardar, y al
 * revés.
 */
export const customFieldsSchemaValidator = z.object({
  fields: z.array(
    z
      .object({
        key: z.string().trim().regex(/^[a-z0-9_-]+$/, 'La llave debe ser minúsculas, números, guiones bajos o guiones'),
        label: z.string().trim().max(100).optional().default(''),
        type: z.enum([...CUSTOM_FIELD_TYPES] as [CustomFieldType, ...CustomFieldType[]]),
        required: z.boolean().default(false),
        options: z.array(z.string().trim().min(1)).optional(),
      })
      .refine((field) => field.type !== 'select' || (field.options?.length ?? 0) > 0, {
        message: 'Un campo de tipo lista necesita al menos una opción.',
        path: ['options'],
      }),
  ),
});

/**
 * Construye el esquema zod de los campos personalizados de una orden.
 *
 * Estricto a propósito: un campo que el tenant no ha declarado es un 400, no
 * un dato suelto que se guarda sin que nadie lo espere. Un tipo desconocido
 * tampoco se degrada a "cualquier cosa" — eso convertiría el esquema en una
 * puerta abierta.
 */
export function buildCustomFieldsZodSchema(fields: CustomFieldDefinition[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields ?? []) {
    if (typeof field?.key !== 'string' || !field.key.trim()) continue;

    let zodField: z.ZodTypeAny;
    if (field.type === 'string') zodField = z.string();
    else if (field.type === 'number') zodField = z.number();
    else if (field.type === 'boolean') zodField = z.boolean();
    else if (field.type === 'select') zodField = z.enum((field.options ?? []) as [string, ...string[]]);
    else if (field.type === 'date') zodField = z.string().regex(ISO_DAY, 'La fecha debe tener formato AAAA-MM-DD');
    else zodField = z.never();

    if (!field.required) zodField = zodField.optional();
    shape[field.key] = zodField;
  }

  return z.object(shape).strict();
}
