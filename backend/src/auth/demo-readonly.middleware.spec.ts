import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { DemoReadOnlyMiddleware } from './demo-readonly.middleware.js';
import * as storage from './tenant-context.storage.js';

function makeReq(method: string): Request {
  return { method } as Request;
}

function makeRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('DemoReadOnlyMiddleware', () => {
  const next: NextFunction = vi.fn();
  const middleware = new DemoReadOnlyMiddleware();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('bloquea DELETE en el tenant demo (id=1) con 403', () => {
    vi.spyOn(storage, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'u1',
      role: 'operario',
    });
    const req = makeReq('DELETE');
    const res = makeRes();
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('bloquea PATCH y PUT en el tenant demo', () => {
    vi.spyOn(storage, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'u1',
      role: 'supervisor',
    });
    for (const m of ['PATCH', 'PUT']) {
      const req = makeReq(m);
      const res = makeRes();
      middleware.use(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    }
  });

  it('permite GET y POST en el tenant demo (crear caduca a las 24h)', () => {
    vi.spyOn(storage, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'u1',
      role: 'operario',
    });
    for (const m of ['GET', 'POST']) {
      const req = makeReq(m);
      const res = makeRes();
      middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('NO bloquea a tenants reales (id != 1)', () => {
    vi.spyOn(storage, 'getTenantContext').mockReturnValue({
      tenantId: 42n,
      userId: 'u1',
      role: 'tenant_admin',
    });
    for (const m of ['DELETE', 'PATCH', 'PUT']) {
      const req = makeReq(m);
      const res = makeRes();
      middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('deja pasar si no hay contexto de tenant (rutas públicas)', () => {
    vi.spyOn(storage, 'getTenantContext').mockImplementation(() => {
      throw new Error('No operational tenant context found.');
    });
    const req = makeReq('DELETE');
    const res = makeRes();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
