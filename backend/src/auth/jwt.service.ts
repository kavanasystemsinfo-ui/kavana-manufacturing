import { Injectable, UnauthorizedException } from '@nestjs/common';
import pkg from 'jsonwebtoken';
const { verify } = pkg;
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { JwtPayload } from './jwt-payload.interface.js';
import type { TenantContext } from './tenant-context.interface.js';

// Fuente de verdad del secret, SIMÉTRICA con auth-login.service.ts (FIX 2026-08-09):
// el login firmaba con JWT_SECRET (o fallback dev) pero el guard verificaba solo
// con JWT_HMAC_SECRET → ningún token del login era válido (401 en todas las rutas,
// el operario 1094 veía el panel de órdenes vacío). Ambos lados usan la MISMA
// cadena: JWT_HMAC_SECRET → JWT_SECRET → fallback dev idéntico al del login.
// Así el contrato login→guard funciona en cualquier configuración de Render.
const JWT_HMAC_SECRET = process.env.JWT_HMAC_SECRET || process.env.JWT_SECRET || 'kavana-jwt-dev-secret-change-me';
if (!process.env.JWT_HMAC_SECRET && !process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_HMAC_SECRET is required');
  console.warn('⚠ JWT_HMAC_SECRET not set — using dev fallback (not for production)');
}

@Injectable()
export class JwtServiceWrapper {
  verifyBearerToken(authorizationHeader: string | undefined): TenantContext {
    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header.');
    }

    const token = authorizationHeader.split(' ')[1];
    // FIX ronda 2: mock-token prohibido en producción aunque alguien deje
    // ALLOW_MOCK_AUTH=true por error en el entorno.
    if (token === 'mock-token' && process.env.ALLOW_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      return {
        tenantId: 1n,
        userId: 'admin-dev-01',
        role: 'tenant_admin',
      };
    }

    // Try HMAC token (from auth-login service)
    try {
      return this.verifyHmacToken(token);
    } catch {
      // Not an HMAC token, try RS256
    }

    // Try RS256 token (from external auth provider)
    const publicKey = process.env.JWT_PUBLIC_KEY;

    if (!publicKey || publicKey.includes('REPLACE_ME')) {
      throw new UnauthorizedException('JWT_PUBLIC_KEY is not configured and token is not a valid HMAC token.');
    }

    try {
      const payload = verify(token, publicKey, {
        algorithms: ['RS256'],
      }) as JwtPayload;

      const tenantIdRaw = payload.tenant_id ?? payload['custom:tenant_id'];
      const role = payload.role ?? payload['custom:role'];

      if (!tenantIdRaw || !role || !payload.sub) {
        throw new UnauthorizedException('Token missing required Kavana claims.');
      }

      return {
        tenantId: BigInt(tenantIdRaw),
        userId: payload.sub,
        role,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid cryptographic token signature.');
    }
  }

  private verifyHmacToken(token: string): TenantContext {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Not an HMAC token');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSig = createHmac('sha256', JWT_HMAC_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');

    if (!signatureB64 || !timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSig))) {
      throw new Error('Invalid HMAC signature');
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as JwtPayload;

    // FIX 2026-08-21 (P1): exp obligatorio. Antes un token sin exp era
    // aceptado como permanente; ahora todo token HMAC debe caducar.
    if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) {
      throw new UnauthorizedException('Token expired');
    }

    if (!payload.tenant_id || !payload.role || !payload.sub) {
      throw new UnauthorizedException('Token missing required Kavana claims.');
    }

    return {
      tenantId: BigInt(payload.tenant_id),
      userId: payload.sub,
      role: payload.role,
    };
  }
}
