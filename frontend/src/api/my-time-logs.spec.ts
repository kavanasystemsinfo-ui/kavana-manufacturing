import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { localDayRange, fetchMyTimeLogs } from './my-time-logs.js';

describe('localDayRange', () => {
  it('devuelve el día local completo, no el día UTC', () => {
    const now = new Date('2026-09-22T15:30:00.000Z');
    const { from, to } = localDayRange(now);
    const start = new Date(from);
    const end = new Date(to);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
    expect(start.getDate()).toBe(now.getDate());
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
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
