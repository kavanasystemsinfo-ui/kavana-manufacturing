import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { localDayRange, fetchMyTimeLogs } from './my-time-logs.js';
import { instanteMadrid } from '../utils/planta-calendario.js';

describe('localDayRange (día fabril 22:00-22:00)', () => {
  it('antes de las 22:00 el día fabril es hoy: de ayer 22:00 a hoy 22:00', () => {
    // Martes 18 nov 2026, 15:30 de Madrid (14:30 UTC en horario de invierno)
    const now = instanteMadrid(2026, 11, 18, 15, 30);
    const { from, to } = localDayRange(now);
    expect(from).toBe(instanteMadrid(2026, 11, 17, 22, 0).toISOString());
    expect(to).toBe(instanteMadrid(2026, 11, 18, 22, 0).toISOString());
  });

  it('a las 22:00 en punto ya empieza el día fabril de mañana', () => {
    // Martes 18 nov 2026, 22:00 de Madrid: el "miércoles 19" de fábrica
    const now = instanteMadrid(2026, 11, 18, 22, 0);
    const { from, to } = localDayRange(now);
    expect(from).toBe(instanteMadrid(2026, 11, 18, 22, 0).toISOString());
    expect(to).toBe(instanteMadrid(2026, 11, 19, 22, 0).toISOString());
  });

  it('a la 01:00 del miércoles el día fabril sigue siendo el miércoles (empezó anoche a las 22:00)', () => {
    const now = instanteMadrid(2026, 11, 19, 1, 0);
    const { from, to } = localDayRange(now);
    expect(from).toBe(instanteMadrid(2026, 11, 18, 22, 0).toISOString());
    expect(to).toBe(instanteMadrid(2026, 11, 19, 22, 0).toISOString());
  });

  it('21:59:59 todavía es el día fabril anterior', () => {
    const now = new Date(instanteMadrid(2026, 11, 18, 22, 0).getTime() - 1000);
    const { from, to } = localDayRange(now);
    expect(from).toBe(instanteMadrid(2026, 11, 17, 22, 0).toISOString());
    expect(to).toBe(instanteMadrid(2026, 11, 18, 22, 0).toISOString());
  });

  it('en el cambio de hora de octubre (25 oct 2026) empieza a las 22:00 local del día anterior', () => {
    // 25 oct 2026 a las 03:00 de Madrid (ya con hora de invierno, UTC+1)
    const now = instanteMadrid(2026, 10, 25, 3, 0);
    const { from, to } = localDayRange(now);
    expect(from).toBe(instanteMadrid(2026, 10, 24, 22, 0).toISOString());
    expect(to).toBe(instanteMadrid(2026, 10, 25, 22, 0).toISOString());
    // Ese día dura 25 h en hora local: el rango fabril también (22:00 a 22:00)
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it('en el cambio de hora de marzo (28 mar 2027) empieza a las 22:00 local del día anterior', () => {
    const now = instanteMadrid(2027, 3, 28, 12, 0);
    const { from, to } = localDayRange(now);
    expect(from).toBe(instanteMadrid(2027, 3, 27, 22, 0).toISOString());
    expect(to).toBe(instanteMadrid(2027, 3, 28, 22, 0).toISOString());
    // Ese día dura 23 h en hora local: el rango fabril también
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(23 * 60 * 60 * 1000);
  });
});

describe('fetchMyTimeLogs', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('llama al endpoint del operario con from/to en la query', async () => {
    await fetchMyTimeLogs({ from: '2026-09-22T00:00:00.000Z', to: '2026-09-23T00:00:00.000Z' });
    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain('/production/time-logs/mine?');
    expect(url).toContain('from=2026-09-22T00%3A00%3A00.000Z');
    expect(url).toContain('to=2026-09-23T00%3A00%3A00.000Z');
  });
});
