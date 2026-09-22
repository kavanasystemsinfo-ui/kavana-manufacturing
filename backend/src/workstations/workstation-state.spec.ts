import { describe, it, expect } from 'vitest';
import { deriveWorkstationState, DEFAULT_STALE_AFTER_MINUTES } from './workstation-state.js';

const NOW = new Date('2026-09-22T12:00:00.000Z');
const minutosAntes = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

describe('deriveWorkstationState (2.3 — estado en tiempo real)', () => {
  it('sin ningún parte registrado, el puesto está sin actividad', () => {
    expect(deriveWorkstationState({ lastType: null, lastEndTime: null }, NOW)).toBe('idle');
  });

  it('un parte de producción reciente deja el puesto en marcha', () => {
    expect(deriveWorkstationState({ lastType: 'produccion', lastEndTime: minutosAntes(5) }, NOW)).toBe('running');
  });

  it('un parte de parada reciente deja el puesto parado', () => {
    expect(deriveWorkstationState({ lastType: 'parada', lastEndTime: minutosAntes(5) }, NOW)).toBe('stopped');
  });

  it('si el último parte es más viejo que el umbral, no se afirma que siga en marcha', () => {
    const viejo = minutosAntes(DEFAULT_STALE_AFTER_MINUTES + 1);
    expect(deriveWorkstationState({ lastType: 'produccion', lastEndTime: viejo }, NOW)).toBe('idle');
    expect(deriveWorkstationState({ lastType: 'parada', lastEndTime: viejo }, NOW)).toBe('idle');
  });

  it('en el umbral exacto todavía se considera actividad válida', () => {
    const limite = minutosAntes(DEFAULT_STALE_AFTER_MINUTES);
    expect(deriveWorkstationState({ lastType: 'produccion', lastEndTime: limite }, NOW)).toBe('running');
  });

  it('una fecha corrupta no se interpreta como actividad', () => {
    expect(deriveWorkstationState({ lastType: 'produccion', lastEndTime: 'no-es-una-fecha' }, NOW)).toBe('idle');
  });

  it('acepta Date además de string ISO', () => {
    expect(deriveWorkstationState({ lastType: 'produccion', lastEndTime: new Date(NOW.getTime() - 60_000) }, NOW)).toBe('running');
  });

  it('un tipo desconocido cae en sin actividad en lugar de inventar estado', () => {
    expect(deriveWorkstationState({ lastType: 'otro' as never, lastEndTime: minutosAntes(1) }, NOW)).toBe('idle');
  });

  it('el umbral es configurable para pruebas y para turnos largos', () => {
    const hace3h = minutosAntes(180);
    expect(deriveWorkstationState({ lastType: 'produccion', lastEndTime: hace3h }, NOW, 240)).toBe('running');
    expect(deriveWorkstationState({ lastType: 'produccion', lastEndTime: hace3h }, NOW, 60)).toBe('idle');
  });
});
