import { describe, expect, it } from 'vitest';
import { describeBlock, formatMinutes, humanizeReason, summarizeOrder, type SummaryLog } from './order-summary.js';

const log = (id: string, type: SummaryLog['type'], start: string, end: string, extra: Partial<SummaryLog> = {}): SummaryLog => ({
  id,
  type,
  downtime_reason: null,
  start_time: start,
  end_time: end,
  ...extra,
});

describe('summarizeOrder', () => {
  it('calcula avance, restante y tasa de defectos con los números del servidor (que llegan como texto)', () => {
    const s = summarizeOrder({ quantity: 357120, produced_quantity: '42132.0000', defect_quantity: '320.0000' }, []);
    expect(s.pct).toBe(12);
    expect(s.remaining).toBe(357120 - 42132);
    expect(s.defectRate).toBe(0.8);
  });

  it('limita el avance a 100 y no da restante negativo', () => {
    const s = summarizeOrder({ quantity: 1000, produced_quantity: 1500 }, []);
    expect(s.pct).toBe(100);
    expect(s.remaining).toBe(0);
  });

  it('sin cantidad prevista el avance es 0', () => {
    expect(summarizeOrder({ quantity: 0, produced_quantity: 5 }, []).pct).toBe(0);
  });

  it('está parada si el último bloque es una parada, con su motivo', () => {
    const s = summarizeOrder({ quantity: 100 }, [
      log('1', 'produccion', '2026-11-02T08:00:00Z', '2026-11-02T10:00:00Z'),
      log('2', 'parada', '2026-11-02T10:20:00Z', '2026-11-02T10:20:00Z', { downtime_reason: 'Faltan piezas' }),
    ]);
    expect(s.stopped).toBe(true);
    expect(s.stopReason).toBe('Faltan piezas');
  });

  it('deja de estar parada cuando después hay un bloque de producción', () => {
    const s = summarizeOrder({ quantity: 100 }, [
      log('2', 'parada', '2026-11-02T10:20:00Z', '2026-11-02T10:20:00Z', { downtime_reason: 'Faltan piezas' }),
      log('3', 'produccion', '2026-11-02T10:40:00Z', '2026-11-02T10:41:00Z'),
    ]);
    expect(s.stopped).toBe(false);
    expect(s.stopReason).toBeNull();
    expect(s.stopsCount).toBe(1);
  });

  it('suma los minutos de las paradas con duración y ordena los recientes de nuevo a viejo', () => {
    const s = summarizeOrder({ quantity: 100 }, [
      log('a', 'parada', '2026-11-02T08:00:00Z', '2026-11-02T08:20:00Z'),
      log('b', 'parada', '2026-11-02T09:00:00Z', '2026-11-02T09:25:00Z'),
      log('c', 'produccion', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z'),
    ]);
    expect(s.stopMinutes).toBe(45);
    expect(s.recent.map((l) => l.id)).toEqual(['c', 'b', 'a']);
  });

  it('enseña como mucho 5 bloques recientes', () => {
    const logs = Array.from({ length: 8 }, (_, i) =>
      log(`l${i}`, 'produccion', `2026-11-02T0${i}:00:00Z`, `2026-11-02T0${i}:30:00Z`),
    );
    expect(summarizeOrder({ quantity: 100 }, logs).recent).toHaveLength(5);
  });
});

describe('formatMinutes', () => {
  it('escribe minutos y horas', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(65)).toBe('1 h 05 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(-3)).toBe('0 min');
  });
});

describe('describeBlock', () => {
  it('describe una parada con su motivo', () => {
    const text = describeBlock(log('p', 'parada', '2026-11-02T10:20:00', '2026-11-02T10:20:00', { downtime_reason: ' Faltan piezas ' }));
    expect(text).toBe('10:20 · Parada: Faltan piezas');
    const clave = describeBlock(log('q', 'parada', '2026-11-02T07:07:00', '2026-11-02T07:07:00', { downtime_reason: 'mantenimiento_menor' }));
    expect(clave).toBe('07:07 · Parada: Mantenimiento menor');
  });

  it('describe producción con punto de miles y defectos solo si hay', () => {
    const a = describeBlock(log('x', 'produccion', '2026-11-02T10:00:00', '2026-11-02T12:00:00', { produced_quantity: 12000, defect_quantity: 40 }));
    expect(a).toBe('10:00–12:00 · 12.000 buenas · 40 defectos');
    const b = describeBlock(log('y', 'produccion', '2026-11-02T10:00:00', '2026-11-02T12:00:00', { produced_quantity: '800', defect_quantity: 0 }));
    expect(b).toBe('10:00–12:00 · 800 buenas');
  });
});

describe('humanizeReason', () => {
  it('convierte la clave en texto legible y respeta lo que ya lo es', () => {
    expect(humanizeReason('mantenimiento_menor')).toBe('Mantenimiento menor');
    expect(humanizeReason('Faltan piezas')).toBe('Faltan piezas');
    expect(humanizeReason('  ')).toBeNull();
    expect(humanizeReason(null)).toBeNull();
  });
});
