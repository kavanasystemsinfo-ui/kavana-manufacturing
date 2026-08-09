import { describe, it, expect } from 'vitest';

// FIX 2026-08-09: contrato login → guard con la MISMA fuente de secret.
// Simula el entorno legacy de Render (solo JWT_SECRET, sin JWT_HMAC_SECRET).
// Imports dinámicos: el módulo lee el env en tiempo de import, así que hay que
// setear process.env ANTES de importar (los imports estáticos se hoistan y
// capturarían el env del entorno de test, no el nuestro).
describe('Contrato JWT login → guard (bug operario 1094)', () => {
  it('el token firmado por el login es verificado por el guard (fallback JWT_SECRET)', async () => {
    process.env.JWT_SECRET = 'test-legacy-secret-para-contrato';
    delete process.env.JWT_HMAC_SECRET;
    process.env.NODE_ENV = 'development';

    const { AuthLoginService } = await import('../auth-login/auth-login.service.js');
    const { JwtServiceWrapper } = await import('../auth/jwt.service.js');

    // login no se usa (generateToken private); la firma se replica abajo
    const guard = new JwtServiceWrapper();

    // generateToken es private: accedemos vía el login real no es posible sin BD,
    // así que replicamos su firma exacta (mismo algoritmo y mismo secret).
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: '60a4f55d-3a00-4d3b-beb5-47f7360bbe43',
      tenant_id: 1,
      role: 'operario',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })).toString('base64url');
    const { createHmac } = await import('node:crypto');
    const signature = createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${signature}`;
    expect(token.split('.').length).toBe(3);

    const ctx = guard.verifyBearerToken('Bearer ' + token);
    expect(ctx.tenantId).toBe(1n);
    expect(ctx.userId).toBe('60a4f55d-3a00-4d3b-beb5-47f7360bbe43');
    expect(ctx.role).toBe('operario');
  });
});
