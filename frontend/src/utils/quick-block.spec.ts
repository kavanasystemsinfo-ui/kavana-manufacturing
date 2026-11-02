import { describe, expect, it } from 'vitest';
import { formatPercent, formatThousands, roundUpToFive, stepQuantity, suggestBlockStart, toHHMM } from './quick-block.js';
import type { SummaryLog } from './order-summary.js';

const log = (end: string): SummaryLog => ({
  id: end,
  type: 'produccion',
  downtime_reason: null,
  start_time: '2026-11-02T06:00:00',
  end_time: end,
});

describe('suggestBlockStart', () => {
  const now = new Date('2026-11-02T12:30:00');

  it('propone el final del último bloque de hoy', () => {
    const s = suggestBlockStart([log('2026-11-02T09:00:00'), log('2026-11-02T11:15:00')], now);
    expect(s).toBe('11:15');
  });

  it('ignora bloques de otros días y bloques que acaban en el futuro', () => {
    expect(suggestBlockStart([log('2026-11-01T22:00:00')], now)).toBeNull();
    expect(suggestBlockStart([log('2026-11-02T13:00:00')], now)).toBeNull();
  });

  it('acepta un fin redondeado que cae unos minutos por delante de la hora actual', () => {
    expect(suggestBlockStart([log('2026-11-02T12:35:00')], now)).toBe('12:35');
    expect(suggestBlockStart([log('2026-11-02T12:36:00')], now)).toBeNull();
  });

  it('sin bloques no sugiere nada', () => {
    expect(suggestBlockStart([], now)).toBeNull();
  });
});

describe('stepQuantity', () => {
  it('suma y resta sin bajar de cero', () => {
    expect(stepQuantity('', 10)).toBe('10');
    expect(stepQuantity('25', -10)).toBe('15');
    expect(stepQuantity('5', -10)).toBe('0');
    expect(stepQuantity('abc', 1)).toBe('1');
  });
});

describe('formatPercent / toHHMM', () => {
  it('usa coma decimal', () => {
    expect(formatPercent(2.4)).toBe('2,4 %');
    expect(formatPercent(0)).toBe('0 %');
  });
  it('rellena con ceros', () => {
    expect(toHHMM(new Date('2026-11-02T07:05:00'))).toBe('07:05');
  });
});

describe('formatThousands', () => {
  it('pone punto de miles desde 4 cifras', () => {
    expect(formatThousands(10)).toBe('10');
    expect(formatThousands(1000)).toBe('1.000');
    expect(formatThousands(1234567)).toBe('1.234.567');
  });
});

describe('roundUpToFive', () => {
  const at = (hhmmss: string) => toHHMM(roundUpToFive(new Date(`2026-11-02T${hhmmss}`)));

  it('redondea al alza al siguiente múltiplo de 5', () => {
    expect(at('19:51:00')).toBe('19:55');
    expect(at('19:56:00')).toBe('20:00');
    expect(at('19:59:59')).toBe('20:00');
  });

  it('una hora que ya es múltiplo de 5 no cambia, pero con segundos sube', () => {
    expect(at('19:50:00')).toBe('19:50');
    expect(at('19:50:01')).toBe('19:55');
  });

  it('cruza la medianoche', () => {
    expect(at('23:58:00')).toBe('00:00');
  });
});
