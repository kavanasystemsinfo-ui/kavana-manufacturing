import { describe, it, expect } from 'vitest';
import { FIELD_TYPE_LABELS, normalizeFieldKey, validateCustomFieldsDraft, type CustomFieldDraft } from './custom-fields.js';

const campo = (over: Partial<CustomFieldDraft> = {}): CustomFieldDraft => ({
  key: 'lote',
  label: 'Lote',
  type: 'string',
  required: false,
  ...over,
});

describe('FIELD_TYPE_LABELS (2.5)', () => {
  it('nombra los cinco tipos en español, sin jerga', () => {
    expect(FIELD_TYPE_LABELS.string).toBe('Texto');
    expect(FIELD_TYPE_LABELS.number).toBe('Número');
    expect(FIELD_TYPE_LABELS.boolean).toBe('Sí/No');
    expect(FIELD_TYPE_LABELS.select).toBe('Lista de opciones');
    expect(FIELD_TYPE_LABELS.date).toBe('Fecha');
  });
});

describe('normalizeFieldKey', () => {
  it('convierte un nombre legible en una llave válida para el backend', () => {
    expect(normalizeFieldKey('Nº de Lote')).toBe('n_de_lote');
  });

  it('quita acentos en vez de dejarlos fuera de la regla', () => {
    expect(normalizeFieldKey('Número')).toBe('numero');
  });

  it('recorta separadores sobrantes en los extremos', () => {
    expect(normalizeFieldKey('  __lote__ ')).toBe('lote');
  });
});

describe('validateCustomFieldsDraft', () => {
  it('un borrador correcto no da errores', () => {
    expect(validateCustomFieldsDraft([campo()])).toEqual([]);
  });

  it('sin campos no hay nada que validar', () => {
    expect(validateCustomFieldsDraft([])).toEqual([]);
  });

  it('detecta una llave vacía y dice en qué fila', () => {
    const errores = validateCustomFieldsDraft([campo(), campo({ key: '  ' })]);
    expect(errores).toHaveLength(1);
    expect(errores[0]).toContain('fila 2');
  });

  it('detecta llaves duplicadas', () => {
    const errores = validateCustomFieldsDraft([campo({ key: 'lote' }), campo({ key: 'lote' })]);
    expect(errores.join(' ')).toContain('duplicad');
  });

  it('rechaza llaves con espacios o mayúsculas, que el backend no acepta', () => {
    expect(validateCustomFieldsDraft([campo({ key: 'Nº Lote' })])).toHaveLength(1);
  });

  it('una lista sin opciones se rechaza aquí, no con un 400 al guardar', () => {
    const errores = validateCustomFieldsDraft([campo({ type: 'select', options: [] })]);
    expect(errores.join(' ')).toContain('opción');
  });

  it('opciones en blanco cuentan como vacías', () => {
    const errores = validateCustomFieldsDraft([campo({ type: 'select', options: ['A', '   '] })]);
    expect(errores.join(' ')).toContain('opción');
  });

  it('opciones repetidas en la misma lista se detectan', () => {
    const errores = validateCustomFieldsDraft([campo({ type: 'select', options: ['A', 'A'] })]);
    expect(errores.join(' ')).toContain('repetid');
  });

  it('acumula varios problemas en lugar de parar en el primero', () => {
    const errores = validateCustomFieldsDraft([
      campo({ key: '' }),
      campo({ key: 'mal key' }),
      campo({ type: 'select', options: [] }),
    ]);
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });
});
