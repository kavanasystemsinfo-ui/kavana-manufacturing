import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callApiWithTimeout, SesionCaducadaError } from './client.js';

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

  it('al cortar por tiempo dice que el servidor tarda, no «signal is aborted»', async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('signal is aborted without reason', 'AbortError')));
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const pending = callApiWithTimeout('/api/test');
    const assertion = expect(pending).rejects.toThrow('El servidor tarda en responder');
    vi.advanceTimersByTime(15000);
    await assertion;
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

  it('un 401 lanza SesionCaducadaError (no un HTTP 401 genérico)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(callApiWithTimeout('/api/test')).rejects.toBeInstanceOf(SesionCaducadaError);
    await expect(callApiWithTimeout('/api/test')).rejects.toThrow('La sesión ha caducado');
  });

  it('sin token guardado no envía cabecera Authorization (antes enviaba "mock-token")', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);

    await callApiWithTimeout('/api/test');
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
