import { UnauthorizedException } from '@nestjs/common';
import { generateKeyPairSync } from 'node:crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JwtServiceWrapper } from './jwt.service.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const PRIVATE_KEY = privateKey;
const PUBLIC_KEY = publicKey;


const WRONG_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmQmiFwwIesvCzaWKo5fn
VTVfrwQiHaReFINW0VXvBkupekcJAb65rrqj35QIIUGED5CL4qfk5LzCkq9DnTAY
cRtOhRXyX+EtjhSjtXwPYNgQJD8Q8StOKolMhKnAa3vlEhgBCRZVcpg3VoCsEcch
pG37lnGL81DkGsiayQpnglMZOwiE5BKTXZXTCGdD/6PyQDHyS+zjWKZIEj2cR4Xo
P6W0iQOPPC8SOMa3heFsMF9AUmg97RP5eAB/wNQGqia0A+HJ0cQZ8fo7aMfD/OeF
QA8ACg8M5UfShYRyZtgoghTraxCWx1+KDwueRONb6s4bIFpzKwOpvdfdB0dmtHNV
TwIDAQAB
-----END PUBLIC KEY-----`;

function signToken(payload: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256', expiresIn: '1h' });
}

describe('JwtServiceWrapper', () => {
  let service: JwtServiceWrapper;
  const originalEnv = process.env;

  beforeEach(() => {
    service = new JwtServiceWrapper();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('debería lanzar 401 si no hay header de autorización', () => {
    expect(() => service.verifyBearerToken(undefined)).toThrow(UnauthorizedException);
    expect(() => service.verifyBearerToken(undefined)).toThrow('Missing or malformed Authorization header.');
  });

  it('debería lanzar 401 si el header no tiene prefijo Bearer', () => {
    expect(() => service.verifyBearerToken('Basic abc123')).toThrow(UnauthorizedException);
    expect(() => service.verifyBearerToken('Basic abc123')).toThrow('Missing or malformed Authorization header.');
  });

  it('debería lanzar 401 si el token es mock-token y ALLOW_MOCK_AUTH no es "true"', () => {
    delete process.env.ALLOW_MOCK_AUTH;
    expect(() => service.verifyBearerToken('Bearer mock-token')).toThrow(UnauthorizedException);
  });

  it('debería lanzar 401 si el token es mock-token y ALLOW_MOCK_AUTH es "false"', () => {
    process.env.ALLOW_MOCK_AUTH = 'false';
    expect(() => service.verifyBearerToken('Bearer mock-token')).toThrow(UnauthorizedException);
  });

  it('debería devolver contexto válido si el token es mock-token y ALLOW_MOCK_AUTH es "true"', () => {
    process.env.ALLOW_MOCK_AUTH = 'true';
    const context = service.verifyBearerToken('Bearer mock-token');
    expect(context.tenantId).toBe(1n);
    expect(context.userId).toBe('admin-dev-01');
    expect(context.role).toBe('tenant_admin');
  });

  it('debería lanzar 401 si JWT_PUBLIC_KEY no está configurado', () => {
    delete process.env.JWT_PUBLIC_KEY;
    const token = signToken({ sub: 'user-1', tenant_id: '1', role: 'operario' });
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow(UnauthorizedException);
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow('JWT_PUBLIC_KEY is not configured');
  });

  it('debería lanzar 401 si JWT_PUBLIC_KEY contiene REPLACE_ME', () => {
    process.env.JWT_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nREPLACE_ME\n-----END PUBLIC KEY-----';
    const token = signToken({ sub: 'user-1', tenant_id: '1', role: 'operario' });
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow(UnauthorizedException);
  });

  it('debería lanzar 401 si el token tiene firma inválida (wrong key)', () => {
    process.env.JWT_PUBLIC_KEY = WRONG_PUBLIC_KEY;
    const token = signToken({ sub: 'user-1', tenant_id: '1', role: 'operario' });
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow(UnauthorizedException);
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow('Invalid cryptographic token signature.');
  });

  it('debería lanzar 401 si el token no tiene claim sub', () => {
    process.env.JWT_PUBLIC_KEY = PUBLIC_KEY;
    const token = signToken({ tenant_id: '1', role: 'operario' });
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow(UnauthorizedException);
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow('Token missing required Kavana claims.');
  });

  it('debería lanzar 401 si el token no tiene claim tenant_id', () => {
    process.env.JWT_PUBLIC_KEY = PUBLIC_KEY;
    const token = signToken({ sub: 'user-1', role: 'operario' });
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow(UnauthorizedException);
  });

  it('debería lanzar 401 si el token no tiene claim role', () => {
    process.env.JWT_PUBLIC_KEY = PUBLIC_KEY;
    const token = signToken({ sub: 'user-1', tenant_id: '1' });
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow(UnauthorizedException);
  });

  it('debería devolver contexto válido con claims estándar', () => {
    process.env.JWT_PUBLIC_KEY = PUBLIC_KEY;
    const token = signToken({ sub: 'user-42', tenant_id: '7', role: 'supervisor' });
    const context = service.verifyBearerToken(`Bearer ${token}`);
    expect(context.tenantId).toBe(7n);
    expect(context.userId).toBe('user-42');
    expect(context.role).toBe('supervisor');
  });

  it('debería soportar claims de estilo Cognito (custom:tenant_id, custom:role)', () => {
    process.env.JWT_PUBLIC_KEY = PUBLIC_KEY;
    const token = signToken({ sub: 'user-99', 'custom:tenant_id': '3', 'custom:role': 'operario' });
    const context = service.verifyBearerToken(`Bearer ${token}`);
    expect(context.tenantId).toBe(3n);
    expect(context.userId).toBe('user-99');
    expect(context.role).toBe('operario');
  });

  it('debería manejar errores inesperados como 401 genérico', () => {
    process.env.JWT_PUBLIC_KEY = PUBLIC_KEY;
    const token = 'not.a.real.jwt.token';
    expect(() => service.verifyBearerToken(`Bearer ${token}`)).toThrow(UnauthorizedException);
  });
});
