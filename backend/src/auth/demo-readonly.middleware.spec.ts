import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { DemoReadOnlyMiddleware } from './demo-readonly.middleware.js';
import * as storage from './tenant-context.storage.js';
import type { KavanaRole } from './tenant-context.interface.js';

const UUID = '3f1b0f9e-9d1a-4a2b-8c3d-5e6f7a8b9c0d';

function makeReq(method: string, path = '/api/v1/orders'): Request {
  return { method, originalUrl: path, url: path } as Request;
}

function makeRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

function asDemoTenant(role: KavanaRole = 'supervisor'): void {
  vi.spyOn(storage, 'getTenantContext').mockReturnValue({
    tenantId: 1n,
    userId: 'u1',
    role,
  });
}

describe('DemoReadOnlyMiddleware', () => {
  const next: NextFunction = vi.fn();
  const middleware = new DemoReadOnlyMiddleware();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('bloquea DELETE en el tenant demo (id=1) con 403', () => {
    asDemoTenant();
    const req = makeReq('DELETE', `/api/v1/orders/${UUID}`);
    const res = makeRes();
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('bloquea el borrado de incidencias del histórico (el comentario de app.module lo prometía)', () => {
    asDemoTenant('tenant_admin');
    const req = makeReq('DELETE', `/api/v1/incidencias/${UUID}`);
    const res = makeRes();
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('bloquea DELETE aunque la URL lleve query string', () => {
    asDemoTenant();
    const req = makeReq('DELETE', `/api/v1/orders/${UUID}?force=1`);
    const res = makeRes();
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite mover el ESTADO de una orden (PUT y PATCH)', () => {
    asDemoTenant();
    for (const m of ['PUT', 'PATCH']) {
      const req = makeReq(m, `/api/v1/orders/${UUID}`);
      const res = makeRes();
      middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('permite mover el ESTADO de una incidencia (PUT)', () => {
    asDemoTenant();
    const req = makeReq('PUT', `/api/v1/incidencias/${UUID}`);
    const res = makeRes();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('sigue bloqueando la edición de catálogos, usuarios y utillajes', () => {
    asDemoTenant('tenant_admin');
    const rutas = [
      `/api/v1/workstations/${UUID}`,
      `/api/v1/users/${UUID}`,
      `/api/v1/manufacturing-models/${UUID}`,
      `/api/v1/toolings/${UUID}`,
      `/api/v1/materials/${UUID}`,
      `/api/v1/tenant/capabilities`,
      `/api/v1/production/work-blocks/${UUID}`,
    ];
    for (const ruta of rutas) {
      const req = makeReq('PUT', ruta);
      const res = makeRes();
      middleware.use(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('no deja pasar por la puerta del estado a un subpath que no es un id', () => {
    asDemoTenant();
    const req = makeReq('PUT', '/api/v1/orders/available');
    const res = makeRes();
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite GET y POST en el tenant demo (crear caduca a las 24h)', () => {
    asDemoTenant('operario');
    for (const m of ['GET', 'POST']) {
      const req = makeReq(m, '/api/v1/orders');
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
      const req = makeReq(m, `/api/v1/orders/${UUID}`);
      const res = makeRes();
      middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('deja pasar si no hay contexto de tenant (rutas públicas)', () => {
    vi.spyOn(storage, 'getTenantContext').mockImplementation(() => {
      throw new Error('No operational tenant context found.');
    });
    const req = makeReq('DELETE', `/api/v1/orders/${UUID}`);
    const res = makeRes();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
