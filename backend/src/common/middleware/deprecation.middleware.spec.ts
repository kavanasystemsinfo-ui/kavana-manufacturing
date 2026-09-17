import { describe, it, expect, vi } from 'vitest';
import { ApiDeprecationWarningMiddleware } from './deprecation.middleware.js';

/**
 * Contrato del aviso de deprecación: cabecera `Warning` en las rutas /api/*
 * que no son /api/v1/*, y silencio en el resto. Además se comprueba que el
 * método se puede registrar en Express, que solo acepta funciones: registrar
 * la instancia de clase en app.use() tumbaba el arranque
 * (TypeError: app.use() requires a middleware function).
 */
function respuestaFalsa() {
  const cabeceras: Record<string, string> = {};
  return {
    cabeceras,
    setHeader: (k: string, v: string) => {
      cabeceras[k] = v;
    },
  };
}

describe('ApiDeprecationWarningMiddleware', () => {
  it('avisa con la cabecera Warning en una ruta /api/ sin versión', () => {
    const mw = new ApiDeprecationWarningMiddleware();
    const res = respuestaFalsa();
    const next = vi.fn();

    mw.use({ path: '/api/orders' } as never, res as never, next);

    expect(res.cabeceras.Warning).toContain('Deprecated API endpoint');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('no avisa en las rutas ya versionadas /api/v1/', () => {
    const mw = new ApiDeprecationWarningMiddleware();
    const res = respuestaFalsa();
    const next = vi.fn();

    mw.use({ path: '/api/v1/orders' } as never, res as never, next);

    expect(res.cabeceras.Warning).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('se puede registrar en app.use: el método ligado es una función', () => {
    const mw = new ApiDeprecationWarningMiddleware();
    const registrable = mw.use.bind(mw);

    expect(typeof registrable).toBe('function');
    expect(() => registrable({ path: '/api/x' } as never, respuestaFalsa() as never, vi.fn())).not.toThrow();
  });
});
