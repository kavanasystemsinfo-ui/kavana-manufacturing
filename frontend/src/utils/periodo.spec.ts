import { describe, it, expect } from 'vitest';
import { calcRange, periodoFromQuery, periodoToQuery, PERIODO_LABELS, type Periodo } from './periodo.js';

// Martes 22 de septiembre de 2026. La semana empieza el lunes 21.
const MARTES = new Date('2026-09-22T10:30:00');

describe('calcRange (2.6)', () => {
  it('hoy: un solo día', () => {
    expect(calcRange('hoy', MARTES)).toEqual({ from: '2026-09-22', to: '2026-09-22' });
  });

  it('semana: del lunes a hoy, no siete días atrás', () => {
    expect(calcRange('semana', MARTES)).toEqual({ from: '2026-09-21', to: '2026-09-22' });
  });

  it('semana en lunes: el rango es un solo día', () => {
    expect(calcRange('semana', new Date('2026-09-21T08:00:00'))).toEqual({ from: '2026-09-21', to: '2026-09-21' });
  });

  it('semana en domingo: el lunes es el de esa misma semana', () => {
    expect(calcRange('semana', new Date('2026-09-27T20:00:00'))).toEqual({ from: '2026-09-21', to: '2026-09-27' });
  });

  it('mes: del día 1 a hoy', () => {
    expect(calcRange('mes', MARTES)).toEqual({ from: '2026-09-01', to: '2026-09-22' });
  });

  it('mes anterior: el mes completo, del 1 al último día', () => {
    expect(calcRange('mes_anterior', MARTES)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('mes anterior en enero: cae en diciembre del año anterior', () => {
    expect(calcRange('mes_anterior', new Date('2026-01-15T09:00:00'))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('mes anterior en marzo: febrero corto, sin inventar días', () => {
    expect(calcRange('mes_anterior', new Date('2026-03-15T09:00:00'))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('mes anterior en marzo de año bisiesto: febrero acaba en 29', () => {
    expect(calcRange('mes_anterior', new Date('2028-03-15T09:00:00'))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('todo: sin límites', () => {
    expect(calcRange('todo', MARTES)).toEqual({ from: null, to: null });
  });

  it('personalizado no calcula nada: el rango lo pone quien lo elige', () => {
    expect(calcRange('personalizado', MARTES)).toEqual({ from: null, to: null });
  });
});

describe('PERIODO_LABELS', () => {
  it('nombra todos los modos en español', () => {
    for (const mode of ['hoy', 'semana', 'mes', 'mes_anterior', 'todo', 'personalizado'] as const) {
      expect(PERIODO_LABELS[mode]).toBeTruthy();
    }
  });
});

describe('periodoToQuery / periodoFromQuery (compartir el enlace)', () => {
  it('un modo calculado viaja como mode, sin fechas redundantes', () => {
    expect(periodoToQuery({ mode: 'mes', from: null, to: null })).toBe('periodo=mes');
  });

  it('personalizado viaja con sus fechas', () => {
    const p: Periodo = { mode: 'personalizado', from: '2026-09-01', to: '2026-09-15' };
    expect(periodoToQuery(p)).toBe('periodo=personalizado&desde=2026-09-01&hasta=2026-09-15');
  });

  it('se recupera lo que se escribió', () => {
    expect(periodoFromQuery('?periodo=semana')).toEqual({ mode: 'semana', from: null, to: null });
    expect(periodoFromQuery('?periodo=personalizado&desde=2026-09-01&hasta=2026-09-15')).toEqual({
      mode: 'personalizado',
      from: '2026-09-01',
      to: '2026-09-15',
    });
  });

  it('sin parámetro no hay periodo en la URL', () => {
    expect(periodoFromQuery('')).toBeNull();
    expect(periodoFromQuery('?otra=cosa')).toBeNull();
  });

  it('un modo desconocido en la URL no se acepta a ciegas', () => {
    expect(periodoFromQuery('?periodo=loquesea')).toBeNull();
  });

  it('personalizado sin fechas válidas no se acepta', () => {
    expect(periodoFromQuery('?periodo=personalizado')).toBeNull();
    expect(periodoFromQuery('?periodo=personalizado&desde=01/09/2026&hasta=2026-09-15')).toBeNull();
  });

  it('ida y vuelta completa', () => {
    const original: Periodo = { mode: 'personalizado', from: '2026-01-01', to: '2026-01-31' };
    expect(periodoFromQuery(`?${periodoToQuery(original)}`)).toEqual(original);
  });
});
