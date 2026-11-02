import { describe, expect, it } from 'vitest';
import { shiftReportText, summarizeShift, type ShiftLog } from './shift-summary.js';

const prod = (order: string, start: string, end: string, good: number, bad = 0): ShiftLog => ({
  order_id: order,
  type: 'produccion',
  downtime_reason: null,
  start_time: start,
  end_time: end,
  produced_quantity: good,
  defect_quantity: bad,
});
const stop = (order: string, at: string, reason: string): ShiftLog => ({
  order_id: order,
  type: 'parada',
  downtime_reason: reason,
  start_time: at,
  end_time: at,
});

const label = (id: string) => `Orden ${id}`;
const now = new Date('2026-11-02T12:00:00Z');

describe('summarizeShift', () => {
  const logs = [
    prod('4465', '2026-11-02T06:00:00Z', '2026-11-02T08:00:00Z', 1000, 20),
    stop('4465', '2026-11-02T08:00:00Z', 'Falta material'),
    prod('4465', '2026-11-02T08:30:00Z', '2026-11-02T09:00:00Z', 200, 5),
    prod('4470', '2026-11-02T09:00:00Z', '2026-11-02T10:00:00Z', 3000),
    stop('4470', '2026-11-02T10:00:00Z', 'mantenimiento_menor'),
  ];

  it('suma buenas y defectos por orden, de más a menos producción', () => {
    const s = summarizeShift(logs, label, now);
    expect(s.orders.map((o) => [o.label, o.good, o.defects])).toEqual([
      ['Orden 4470', 3000, 0],
      ['Orden 4465', 1200, 25],
    ]);
    expect(s.kpi.buenas).toBe(4200);
  });

  it('una parada dura hasta el bloque siguiente, y la última hasta ahora', () => {
    const s = summarizeShift(logs, label, now);
    expect(s.stops).toEqual([
      { reason: 'Mantenimiento menor', count: 1, minutes: 120 },
      { reason: 'Falta material', count: 1, minutes: 30 },
    ]);
    expect(s.stopMinutes).toBe(150);
  });

  it('sin bloques todo es cero', () => {
    const s = summarizeShift([], label, now);
    expect(s.orders).toEqual([]);
    expect(s.stopMinutes).toBe(0);
  });
});

describe('shiftReportText', () => {
  it('escribe un resumen legible para el relevo', () => {
    const s = summarizeShift(
      [prod('4465', '2026-11-02T06:00:00Z', '2026-11-02T08:00:00Z', 12000, 40), stop('4465', '2026-11-02T08:00:00Z', 'Falta material')],
      label,
      new Date('2026-11-02T08:20:00Z'),
    );
    const text = shiftReportText(s, { date: 'lunes 2 nov', operator: 'Ana', workstation: 'Extrusora' });
    expect(text).toContain('Cierre de turno · lunes 2 nov · Ana · Extrusora');
    expect(text).toContain('12.000 buenas, 40 defectos');
    expect(text).toContain('- Orden 4465: 12.000 buenas, 40 defectos · 1 parada (20 min)');
    expect(text).toContain('- Falta material: 1 (20 min)');
  });
});
