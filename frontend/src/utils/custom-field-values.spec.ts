import { describe, it, expect } from 'vitest';
import { buildDraftValues, buildPayload, coerceFieldValue, inputTypeForField } from './custom-field-values.js';

describe('inputTypeForField', () => {
  it('da el control que corresponde a cada tipo', () => {
    expect(inputTypeForField('string')).toBe('text');
    expect(inputTypeForField('number')).toBe('number');
    expect(inputTypeForField('boolean')).toBe('checkbox');
    expect(inputTypeForField('select')).toBe('select');
    expect(inputTypeForField('date')).toBe('date');
  });

  it('un tipo desconocido cae a texto en vez de dejar el campo sin control', () => {
    expect(inputTypeForField('lo_que_sea')).toBe('text');
    expect(inputTypeForField('')).toBe('text');
  });
});

describe('coerceFieldValue', () => {
  it('un numero llega como texto desde el input y se guarda como numero', () => {
    expect(coerceFieldValue('number', '3')).toBe(3);
    expect(coerceFieldValue('number', '3.5')).toBe(3.5);
  });

  it('un numero vacio no se guarda como cero: no es lo mismo no rellenarlo que poner 0', () => {
    expect(coerceFieldValue('number', '')).toBeUndefined();
    expect(coerceFieldValue('number', '   ')).toBeUndefined();
  });

  it('un numero que no es numero no se cuela como NaN', () => {
    expect(coerceFieldValue('number', 'muchas')).toBeUndefined();
  });

  it('el si/no se guarda como booleano de verdad, no como la cadena "false"', () => {
    expect(coerceFieldValue('boolean', true)).toBe(true);
    expect(coerceFieldValue('boolean', false)).toBe(false);
    expect(coerceFieldValue('boolean', 'true')).toBe(true);
    expect(coerceFieldValue('boolean', 'false')).toBe(false);
  });

  it('un texto vacio no se guarda como cadena vacia', () => {
    expect(coerceFieldValue('string', '')).toBeUndefined();
    expect(coerceFieldValue('string', '  ')).toBeUndefined();
    expect(coerceFieldValue('string', 'Lote A')).toBe('Lote A');
  });

  it('la fecha se guarda tal cual, que es lo que espera el backend (AAAA-MM-DD)', () => {
    expect(coerceFieldValue('date', '2026-09-22')).toBe('2026-09-22');
    expect(coerceFieldValue('date', '')).toBeUndefined();
  });

  it('en una lista se guarda la opcion elegida', () => {
    expect(coerceFieldValue('select', 'Turno A')).toBe('Turno A');
    expect(coerceFieldValue('select', '')).toBeUndefined();
  });
});

describe('buildDraftValues', () => {
  it('parte de lo que ya tiene la orden, para editar sobre lo que hay', () => {
    const draft = buildDraftValues(
      [{ key: 'lote' }, { key: 'cantidad' }],
      { lote: 'A-1', cantidad: 12 },
    );
    expect(draft).toEqual({ lote: 'A-1', cantidad: '12' });
  });

  it('un campo sin valor arranca vacio y no con undefined, para que el input sea controlado', () => {
    const draft = buildDraftValues([{ key: 'lote' }, { key: 'notas' }], { lote: 'A-1' });
    expect(draft.notas).toBe('');
  });

  it('un booleano arranca como booleano y no como texto', () => {
    const draft = buildDraftValues([{ key: 'urgente' }], { urgente: false });
    expect(draft.urgente).toBe(false);
  });

  it('sin esquema no hay nada que editar', () => {
    expect(buildDraftValues([], { lote: 'A-1' })).toEqual({});
  });
});

describe('buildPayload', () => {
  it('convierte cada campo segun su tipo', () => {
    const payload = buildPayload(
      [{ key: 'lote', type: 'string' }, { key: 'cantidad', type: 'number' }, { key: 'urgente', type: 'boolean' }],
      { lote: 'A-1', cantidad: '12', urgente: true },
    );
    expect(payload).toEqual({ lote: 'A-1', cantidad: 12, urgente: true });
  });

  it('no envia los campos que se han dejado vacios', () => {
    const payload = buildPayload(
      [{ key: 'lote', type: 'string' }, { key: 'notas', type: 'string' }],
      { lote: 'A-1', notas: '' },
    );
    expect(payload).toEqual({ lote: 'A-1' });
    expect('notas' in payload).toBe(false);
  });

  it('un cero se envia, que no es lo mismo que estar vacio', () => {
    expect(buildPayload([{ key: 'defectos', type: 'number' }], { defectos: '0' })).toEqual({ defectos: 0 });
  });

  it('un campo de la orden que ya no esta en el esquema no se manda', () => {
    expect(buildPayload([{ key: 'lote', type: 'string' }], { lote: 'A', viejo: 'x' })).toEqual({ lote: 'A' });
  });
});
