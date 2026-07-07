import { describe, it, expect } from 'vitest';
import { mapCustomFieldsToUI } from './customFieldsMapper.js';

describe('mapCustomFieldsToUI', () => {
  it('Escenario 1: Schema y valores coinciden', () => {
    const customFields = { grosor: 2.5, color: 'Azul' };
    const schema = [
      { key: 'grosor', label: 'Grosor Bobina', type: 'number' },
      { key: 'color', label: 'Color Lacado', type: 'string' }
    ];

    const result = mapCustomFieldsToUI(customFields, schema);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ key: 'grosor', label: 'Grosor Bobina', value: 2.5, type: 'number' });
    expect(result[1]).toEqual({ key: 'color', label: 'Color Lacado', value: 'Azul', type: 'string' });
  });

  it('Escenario 2: Valor existe pero no en schema (usa fallback)', () => {
    const customFields = { old_field: true, another_val: 10 };
    const schema: any[] = []; // Schema vacío, fue borrado por admin

    const result = mapCustomFieldsToUI(customFields, schema);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ key: 'old_field', label: 'Old field', value: true, type: 'boolean' });
    expect(result[1]).toEqual({ key: 'another_val', label: 'Another val', value: 10, type: 'number' });
  });

  it('Escenario 3: Schema define campo pero la orden no lo trae', () => {
    const customFields = { grosor: 2.5 };
    const schema = [
      { key: 'grosor', label: 'Grosor Bobina', type: 'number' },
      { key: 'color', label: 'Color Lacado', type: 'string' } // Falta en customFields
    ];

    const result = mapCustomFieldsToUI(customFields, schema);

    // Solo se renderizan los que la orden realmente tiene
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ key: 'grosor', label: 'Grosor Bobina', value: 2.5, type: 'number' });
  });

  it('debería retornar un array vacío si customFields es undefined o null', () => {
    expect(mapCustomFieldsToUI(undefined, [])).toEqual([]);
    expect(mapCustomFieldsToUI(null as any, [])).toEqual([]);
  });
});
