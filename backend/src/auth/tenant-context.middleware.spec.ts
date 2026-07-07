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

function createMocks(authHeader?: string) {
  const request = { headers: { authorization: authHeader } };
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

  it('debería devolver 401 si el token es inválido', () => {
    const { request, response, next } = createMocks('Bearer invalid-token');
    verifyBearerTokenMock.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    middleware.use(request as any, response as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 401, message: 'Invalid token' });
  });

  it('debería devolver 401 si no hay header de autorización', () => {
    const { request, response, next } = createMocks(undefined);
    verifyBearerTokenMock.mockImplementation(() => {
      throw new Error('Missing or malformed Authorization header.');
    });

    middleware.use(request as any, response as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it('debería devolver 401 con mensaje genérico si el error no es Error', () => {
    const { request, response, next } = createMocks('Bearer bad-token');
    verifyBearerTokenMock.mockImplementation(() => {
      throw 'string error';
    });

    middleware.use(request as any, response as any, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 401, message: 'Unauthorized' });
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
