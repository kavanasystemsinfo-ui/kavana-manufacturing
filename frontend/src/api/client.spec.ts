import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callApiWithTimeout } from './client.js';

describe('API Client (callApiWithTimeout)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('debería abortar la petición al superar el timeout', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);

    callApiWithTimeout('/api/test');

    vi.advanceTimersByTime(15000);

    const callArgs = fetchMock.mock.calls[0];
    const controllerSignal = callArgs[1].signal as AbortSignal;

    expect(controllerSignal.aborted).toBe(true);
  });

  it('debería devolver undefined en respuestas 204 No Content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await callApiWithTimeout('/api/test');
    expect(result).toBeUndefined();
  });

  it('debería lanzar error si la respuesta no es ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not found' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(callApiWithTimeout('/api/test')).rejects.toThrow('Not found');
  });
});
