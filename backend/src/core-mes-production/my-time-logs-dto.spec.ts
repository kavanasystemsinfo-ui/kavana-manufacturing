import { describe, expect, it } from 'vitest';
import { listMyTimeLogsQuerySchema, MAX_TIME_LOG_RANGE_DAYS } from './dto.js';

describe('listMyTimeLogsQuerySchema (2.2 — Mi turno hoy)', () => {
  const from = '2026-09-22T00:00:00.000Z';
  const to = '2026-09-23T00:00:00.000Z';

  it('acepta un rango ISO válido con offset', () => {
    const parsed = listMyTimeLogsQuerySchema.parse({ from, to });
    expect(parsed.from).toBe(from);
    expect(parsed.to).toBe(to);
  });

  it('rechaza fechas sin offset explícito', () => {
    expect(() => listMyTimeLogsQuerySchema.parse({ from: '2026-09-22', to })).toThrow();
  });

  it('rechaza un rango invertido o vacío', () => {
    expect(() => listMyTimeLogsQuerySchema.parse({ from: to, to: from })).toThrow();
    expect(() => listMyTimeLogsQuerySchema.parse({ from, to: from })).toThrow();
  });

  it(`rechaza rangos mayores de ${MAX_TIME_LOG_RANGE_DAYS} días`, () => {
    const wideTo = '2026-12-31T00:00:00.000Z';
    expect(() => listMyTimeLogsQuerySchema.parse({ from, to: wideTo })).toThrow();
  });
});
