import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { verifyBearerTokenMock } = vi.hoisted(() => ({
  verifyBearerTokenMock: vi.fn(),
}));

vi.mock('./jwt.service.js', () => ({
  JwtServiceWrapper: vi.fn().mockImplementation(() => ({
    verifyBearerToken: verifyBearerTokenMock,
  })),
}));

import { TenantContextMiddleware } from './tenant-context.middleware.js';
import { tenantContextStorage } from './tenant-context.storage.js';

function createMocks(authHeader?: string, path = '/orders') {
  const request = { headers: { authorization: authHeader }, path, originalUrl: path } as any;
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { request, response, next };
}

describe('TenantContextMiddleware', () => {
  let middleware: TenantContextMiddleware;

  beforeEach(() => {
    middleware = new TenantContextMiddleware();
    verifyBearerTokenMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debería llamar next() si el token es válido', () => {
    const { request, response, next } = createMocks('Bearer valid-token');
    verifyBearerTokenMock.mockReturnValue({ tenantId: 1n, userId: 'user-1', role: 'operario' });

    middleware.use(request as any, response as any, next);

    expect(next).toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('debería devolver 401 si el token es inválido (ruta no-ai-advisor)', () => {
    const { request, response, next } = createMocks('Bearer invalid-token', '/orders');
    verifyBearerTokenMock.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    middleware.use(request as any, response as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 401, message: 'Invalid token' });
  });

  it('debería devolver 401 si no hay header de autorización (ruta no-ai-advisor)', () => {
    const { request, response, next } = createMocks(undefined, '/orders');
    verifyBearerTokenMock.mockImplementation(() => {
      throw new Error('Missing or malformed Authorization header.');
    });

    middleware.use(request as any, response as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it('debería devolver 401 con mensaje genérico si el error no es Error (ruta no-ai-advisor)', () => {
    const { request, response, next } = createMocks('Bearer bad-token', '/orders');
    verifyBearerTokenMock.mockImplementation(() => {
      throw 'string error';
    });

    middleware.use(request as any, response as any, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 401, message: 'Unauthorized' });
  });

  it('debería permitir la ruta ai-advisor SIN token usando el tenant demo (1)', () => {
    const { request, response, next } = createMocks(undefined, '/ai-advisor/ask');
    verifyBearerTokenMock.mockImplementation(() => {
      throw new Error('Missing or malformed Authorization header.');
    });

    let contextInsideNext: ReturnType<typeof tenantContextStorage.getStore> | undefined;
    next.mockImplementation(() => {
      contextInsideNext = tenantContextStorage.getStore();
    });

    middleware.use(request as any, response as any, next);

    expect(response.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(contextInsideNext?.tenantId).toBe(1n);
    expect(contextInsideNext?.userId).toBe('demo-visitor');
  });

  it('debería permitir la subida móvil de foto de incidencia SIN token (tenant demo por defecto)', () => {
    const { request, response, next } = createMocks(undefined, '/incidencias/upload-mobile/abc-123');
    verifyBearerTokenMock.mockImplementation(() => {
      throw new Error('Missing or malformed Authorization header.');
    });

    let contextInsideNext: ReturnType<typeof tenantContextStorage.getStore> | undefined;
    next.mockImplementation(() => {
      contextInsideNext = tenantContextStorage.getStore();
    });

    middleware.use(request as any, response as any, next);

    expect(response.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(contextInsideNext?.tenantId).toBe(1n);
  });

  it('NO debería permitir GET upload-session SIN token (solo el móvil es público)', () => {
    const { request, response, next } = createMocks(undefined, '/incidencias/upload-session/abc-123');
    verifyBearerTokenMock.mockImplementation(() => {
      throw new Error('Missing or malformed Authorization header.');
    });

    middleware.use(request as any, response as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it('debería ejecutar next dentro de AsyncLocalStorage.run()', () => {
    const { request, response, next } = createMocks('Bearer valid-token');
    verifyBearerTokenMock.mockReturnValue({ tenantId: 5n, userId: 'user-5', role: 'supervisor' });

    let contextInsideNext: ReturnType<typeof tenantContextStorage.getStore> | undefined;
    next.mockImplementation(() => {
      contextInsideNext = tenantContextStorage.getStore();
    });

    middleware.use(request as any, response as any, next);

    expect(contextInsideNext).toBeDefined();
    expect(contextInsideNext?.tenantId).toBe(5n);
    expect(contextInsideNext?.userId).toBe('user-5');
    expect(contextInsideNext?.role).toBe('supervisor');
  });
});
