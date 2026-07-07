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
  });

  it('debería abortar la petición a los 4000ms exactos (escudo industrial)', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);

    const promise = callApiWithTimeout('/api/test');

    vi.advanceTimersByTime(3999);
    
    const callArgs = fetchMock.mock.calls[0];
    const controllerSignal = callArgs[1].signal as AbortSignal;
    
    expect(controllerSignal.aborted).toBe(false);

    vi.advanceTimersByTime(1);

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

  it('debería hacer parse del JSON si la respuesta es ok', async () => {
    const data = { success: true };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(data),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await callApiWithTimeout('/api/test');
    expect(result).toEqual(data);
  });

  it('debería lanzar error si la respuesta no es ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(callApiWithTimeout('/api/test')).rejects.toThrow('HTTP 500');
  });
});
