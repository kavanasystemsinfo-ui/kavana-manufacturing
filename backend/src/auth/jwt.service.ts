import { Injectable, UnauthorizedException } from '@nestjs/common';
import pkg from 'jsonwebtoken';
const { verify } = pkg;
import { createHash } from 'node:crypto';
import type { JwtPayload } from './jwt-payload.interface.js';
import type { TenantContext } from './tenant-context.interface.js';

const HMAC_SECRET = 'kavana-secret';

@Injectable()
export class JwtServiceWrapper {
  verifyBearerToken(authorizationHeader: string | undefined): TenantContext {
    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header.');
    }

    const token = authorizationHeader.split(' ')[1];
    if (token === 'mock-token' && process.env.ALLOW_MOCK_AUTH === 'true') {
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
    const expectedSig = createHash('sha256').update(`${headerB64}.${payloadB64}.${HMAC_SECRET}`).digest('base64url');

    if (signatureB64 !== expectedSig) {
      throw new Error('Invalid HMAC signature');
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as JwtPayload;

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
