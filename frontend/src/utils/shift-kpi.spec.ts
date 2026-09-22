import { describe, it, expect } from 'vitest';
import { calculateShiftKPI } from './shift-kpi.js';

const D = (h: number, m = 0) => `2026-09-22T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;

describe('calculateShiftKPI (2.2 — Mi turno hoy)', () => {
  it('devuelve ceros con lista vacía sin dividir por cero', () => {
    const kpi = calculateShiftKPI([]);
    expect(kpi.horasNetas).toBe(0);
    expect(kpi.buenas).toBe(0);
    expect(kpi.defectos).toBe(0);
    expect(kpi.calidad).toBe(100);
    expect(kpi.oeePersonal).toBe(0);
  });

  it('suma horas netas, buenas y defectos de varios bloques', () => {
    const kpi = calculateShiftKPI([
      { type: 'produccion', start_time: D(8), end_time: D(10), produced_quantity: 100, defect_quantity: 2 },
      { type: 'produccion', start_time: D(10, 15), end_time: D(12), produced_quantity: 80, defect_quantity: 1 },
      { type: 'parada', start_time: D(10), end_time: D(10, 15), downtime_reason: 'Cambio herramienta' },
    ]);
    expect(kpi.horasProduccion).toBe(3.75);
    expect(kpi.horasParada).toBe(0.25);
    expect(kpi.horasNetas).toBe(4);
    expect(kpi.buenas).toBe(180);
    expect(kpi.defectos).toBe(3);
  });

  it('calcula calidad como buenas / total declarado', () => {
    const kpi = calculateShiftKPI([
      { type: 'produccion', start_time: D(8), end_time: D(9), produced_quantity: 90, defect_quantity: 10 },
    ]);
    expect(kpi.calidad).toBe(90);
  });

  it('penaliza el OEE personal cuando hay paradas declaradas', () => {
    const sinParada = calculateShiftKPI([
      { type: 'produccion', start_time: D(8), end_time: D(9), produced_quantity: 100, defect_quantity: 0 },
    ]);
    const conParada = calculateShiftKPI([
      { type: 'produccion', start_time: D(8), end_time: D(9), produced_quantity: 100, defect_quantity: 0 },
      { type: 'parada', start_time: D(9), end_time: D(10), downtime_reason: 'Avería' },
    ]);
    expect(conParada.oeePersonal).toBeLessThan(sinParada.oeePersonal);
  });

  it('ignora bloques con rango temporal inválido en lugar de devolver NaN', () => {
    const kpi = calculateShiftKPI([
      { type: 'produccion', start_time: D(10), end_time: D(9), produced_quantity: 50, defect_quantity: 0 },
      { type: 'produccion', start_time: 'fecha-invalida', end_time: D(9), produced_quantity: 50, defect_quantity: 0 },
    ]);
    expect(kpi.horasProduccion).toBe(0);
    expect(Number.isNaN(kpi.oeePersonal)).toBe(false);
    expect(kpi.buenas).toBe(100);
  });

  it('acota el OEE personal al rango 0-100', () => {
    const kpi = calculateShiftKPI([
      { type: 'produccion', start_time: D(8), end_time: D(9), produced_quantity: 100000, defect_quantity: 0 },
    ]);
    expect(kpi.oeePersonal).toBeLessThanOrEqual(100);
    expect(kpi.oeePersonal).toBeGreaterThanOrEqual(0);
  });
});
