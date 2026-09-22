import { describe, it, expect } from 'vitest';
import { buildCustomFieldsZodSchema, customFieldsSchemaValidator, CUSTOM_FIELD_TYPES, normalizeFieldKey } from './custom-fields.js';

const campo = (over: Partial<{ key: string; type: string; required: boolean; options: string[] }> = {}) => ({
  key: 'lote',
  type: 'string',
  required: false,
  ...over,
});

describe('CUSTOM_FIELD_TYPES', () => {
  it('cubre los cinco tipos que ofrece el constructor visual', () => {
    expect([...CUSTOM_FIELD_TYPES].sort()).toEqual(['boolean', 'date', 'number', 'select', 'string']);
  });
});

describe('normalizeFieldKey', () => {
  it('pasa a minúsculas y sustituye lo que no vale por guion bajo', () => {
    expect(normalizeFieldKey('Nº de Lote')).toBe('n_de_lote');
  });

  it('quita acentos en lugar de dejarlos fuera de la regla', () => {
    expect(normalizeFieldKey('Número')).toBe('numero');
  });

  it('recorta guiones sobrantes en los extremos', () => {
    expect(normalizeFieldKey('  __lote__  ')).toBe('lote');
  });

  it('una entrada sin caracteres válidos queda vacía para que se detecte', () => {
    expect(normalizeFieldKey('¿?')).toBe('');
  });
});

describe('buildCustomFieldsZodSchema (2.5)', () => {
  it('una lista vacía acepta solo un objeto vacío', () => {
    const schema = buildCustomFieldsZodSchema([]);
    expect(schema.parse({})).toEqual({});
    expect(() => schema.parse({ algo: 1 })).toThrow();
  });

  it('string acepta texto y rechaza números', () => {
    const schema = buildCustomFieldsZodSchema([campo({ type: 'string' })]);
    expect(schema.parse({ lote: 'A-1' })).toEqual({ lote: 'A-1' });
    expect(() => schema.parse({ lote: 7 })).toThrow();
  });

  it('number acepta número y rechaza texto', () => {
    const schema = buildCustomFieldsZodSchema([campo({ type: 'number' })]);
    expect(schema.parse({ lote: 7 })).toEqual({ lote: 7 });
    expect(() => schema.parse({ lote: 'siete' })).toThrow();
  });

  it('boolean acepta booleano y rechaza el texto "true"', () => {
    const schema = buildCustomFieldsZodSchema([campo({ type: 'boolean' })]);
    expect(schema.parse({ lote: true })).toEqual({ lote: true });
    expect(() => schema.parse({ lote: 'true' })).toThrow();
  });

  it('select solo acepta una de sus opciones', () => {
    const schema = buildCustomFieldsZodSchema([campo({ type: 'select', options: ['A', 'B'] })]);
    expect(schema.parse({ lote: 'A' })).toEqual({ lote: 'A' });
    expect(() => schema.parse({ lote: 'C' })).toThrow();
  });

  it('un select sin opciones no acepta nada: no puede quedar como comodín', () => {
    const schema = buildCustomFieldsZodSchema([campo({ type: 'select', options: [] })]);
    expect(() => schema.parse({ lote: 'lo-que-sea' })).toThrow();
  });

  it('date exige una fecha ISO en formato día', () => {
    const schema = buildCustomFieldsZodSchema([campo({ type: 'date' })]);
    expect(schema.parse({ lote: '2026-09-22' })).toEqual({ lote: '2026-09-22' });
    expect(() => schema.parse({ lote: '22/09/2026' })).toThrow();
    expect(() => schema.parse({ lote: 'ayer' })).toThrow();
  });

  it('un tipo desconocido no se convierte en comodín: se rechaza', () => {
    const schema = buildCustomFieldsZodSchema([campo({ type: 'inventado' })]);
    expect(() => schema.parse({ lote: 'cualquier cosa' })).toThrow();
  });

  it('los campos requeridos faltantes fallan y los opcionales no', () => {
    const schema = buildCustomFieldsZodSchema([
      campo({ key: 'obligatorio', type: 'string', required: true }),
      campo({ key: 'opcional', type: 'string', required: false }),
    ]);
    expect(schema.parse({ obligatorio: 'x' })).toEqual({ obligatorio: 'x' });
    expect(() => schema.parse({ opcional: 'y' })).toThrow();
  });

  it('un campo sin key utilizable se ignora en lugar de romper el formulario', () => {
    const schema = buildCustomFieldsZodSchema([campo({ key: '', type: 'string' }), campo({ key: 'bueno', type: 'number' })]);
    expect(schema.parse({ bueno: 1 })).toEqual({ bueno: 1 });
  });

  it('los campos no declarados se rechazan (strict)', () => {
    const schema = buildCustomFieldsZodSchema([campo({ type: 'string' })]);
    expect(() => schema.parse({ lote: 'A', intruso: 'no' })).toThrow();
  });
});

describe('customFieldsSchemaValidator — lo que el admin puede guardar (2.5)', () => {
  const schemaCon = (type: string, extra: Record<string, unknown> = {}) => ({
    fields: [{ key: 'lote', label: 'Lote', type, ...extra }],
  });

  it('acepta los cinco tipos del constructor visual', () => {
    for (const type of ['string', 'number', 'boolean', 'date']) {
      expect(() => customFieldsSchemaValidator.parse(schemaCon(type))).not.toThrow();
    }
    expect(() => customFieldsSchemaValidator.parse(schemaCon('select', { options: ['A'] }))).not.toThrow();
  });

  it('un tipo fuera de la lista no se puede guardar', () => {
    expect(() => customFieldsSchemaValidator.parse(schemaCon('inventado'))).toThrow();
  });

  it('una lista sin opciones no se puede guardar: quedaría un campo que rechaza todo', () => {
    expect(() => customFieldsSchemaValidator.parse(schemaCon('select', { options: [] }))).toThrow();
    expect(() => customFieldsSchemaValidator.parse(schemaCon('select'))).toThrow();
  });

  it('las opciones vacías o en blanco se rechazan', () => {
    expect(() => customFieldsSchemaValidator.parse(schemaCon('select', { options: [''] }))).toThrow();
    expect(() => customFieldsSchemaValidator.parse(schemaCon('select', { options: ['   '] }))).toThrow();
  });

  it('la llave debe ir en minúsculas sin espacios, como exige la columna jsonb', () => {
    expect(() => customFieldsSchemaValidator.parse({ fields: [{ key: 'Nº Lote', type: 'string' }] })).toThrow();
    expect(customFieldsSchemaValidator.parse({ fields: [{ key: 'num_lote', type: 'string' }] }).fields[0].key).toBe('num_lote');
  });

  it('label y required tienen valor por defecto para no obligar a rellenarlos', () => {
    const parsed = customFieldsSchemaValidator.parse({ fields: [{ key: 'lote', type: 'string' }] });
    expect(parsed.fields[0]).toMatchObject({ label: '', required: false });
  });

  it('lo que guarda el validador lo acepta después el esquema de la orden (coherencia)', () => {
    const parsed = customFieldsSchemaValidator.parse(
      schemaCon('select', { options: ['A', 'B'], required: true }),
    );
    const orderSchema = buildCustomFieldsZodSchema(parsed.fields);
    expect(orderSchema.parse({ lote: 'B' })).toEqual({ lote: 'B' });
    expect(() => orderSchema.parse({ lote: 'Z' })).toThrow();
  });
});
