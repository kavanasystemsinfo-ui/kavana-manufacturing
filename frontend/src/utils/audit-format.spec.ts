import { describe, it, expect } from 'vitest';
import { ACTION_LABELS, changedKeys, describeActor, formatAuditDate, summarizeAuditEntry, type AuditEntry } from './audit-format.js';

const entrada = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  id: 'a1',
  actor_user_id: null,
  action: 'custom_fields_schema',
  previous_value: {},
  new_value: {},
  metadata: {},
  created_at: '2026-09-22T10:30:00.000Z',
  ...over,
});

describe('changedKeys (2.7)', () => {
  it('detecta los apartados que cambian de valor', () => {
    expect(changedKeys({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual(['b']);
  });

  it('detecta los que se añaden y los que desaparecen', () => {
    expect(changedKeys({ a: 1 }, { a: 1, b: 2 })).toEqual(['b']);
    expect(changedKeys({ a: 1, b: 2 }, { a: 1 })).toEqual(['b']);
  });

  it('compara por contenido, no por referencia', () => {
    expect(changedKeys({ f: { x: [1, 2] } }, { f: { x: [1, 2] } })).toEqual([]);
  });

  it('un cambio dentro de un apartado cuenta como ese apartado', () => {
    expect(changedKeys({ f: { x: 1 } }, { f: { x: 2 } })).toEqual(['f']);
  });

  it('con valores nulos no revienta', () => {
    expect(changedKeys(null, undefined)).toEqual([]);
    expect(changedKeys(null, { a: 1 })).toEqual(['a']);
  });
});

describe('describeActor', () => {
  it('el trigger no registra usuario, y eso se dice en lugar de dejarlo vacío', () => {
    expect(describeActor(null)).toBe('Sistema (sin usuario registrado)');
  });

  it('si algún día llega el usuario, se muestra', () => {
    expect(describeActor('7f3a1c2e-0000-0000-0000-000000000000')).toBe('7f3a1c2e');
  });
});

describe('summarizeAuditEntry', () => {
  it('nombra el apartado tocado y cuántos cambios lleva', () => {
    const resumen = summarizeAuditEntry(
      entrada({ previous_value: { produccion: 1, calidad: 1 }, new_value: { produccion: 2, calidad: 1 } }),
    );
    expect(resumen).toContain(ACTION_LABELS.custom_fields_schema);
    expect(resumen).toContain('produccion');
  });

  it('si no hay diferencias lo dice, en vez de mostrar un cambio fantasma', () => {
    expect(summarizeAuditEntry(entrada({ previous_value: { a: 1 }, new_value: { a: 1 } }))).toContain('sin cambios');
  });

  it('con un action desconocido muestra la clave en crudo, no una cadena vacía', () => {
    expect(summarizeAuditEntry(entrada({ action: 'lo_que_sea' as AuditEntry['action'] }))).toContain('lo_que_sea');
  });

  it('con muchos apartados no enumera cien: resume', () => {
    const previo = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, 1]));
    const nuevo = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, 2]));
    const resumen = summarizeAuditEntry(entrada({ previous_value: previo, new_value: nuevo }));
    expect(resumen).toContain('12');
    expect(resumen).not.toContain('k11');
  });
});

describe('formatAuditDate', () => {
  it('fecha y hora en formato español', () => {
    const texto = formatAuditDate('2026-09-22T10:30:00.000Z');
    expect(texto).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('una fecha inválida no rompe la tabla', () => {
    expect(formatAuditDate('no-es-una-fecha')).toBe('no-es-una-fecha');
  });
});
