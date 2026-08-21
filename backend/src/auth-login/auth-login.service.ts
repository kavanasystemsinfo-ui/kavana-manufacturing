import { Injectable, UnauthorizedException } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { createHash, createHmac, randomBytes, timingSafeEqual, scryptSync } from 'node:crypto';

// El guard (jwt.service.ts) verifica con JWT_HMAC_SECRET. El login DEBE firmar
// con el mismo secret o ningún token del login es válido (401 en todas las rutas).
// FIX 2026-08-09: antes firmaba con JWT_SECRET (variable distinta, o fallback dev)
// → el operario 1094 veía el panel de órdenes vacío (401 capturado como []).
const JWT_SECRET = process.env.JWT_HMAC_SECRET || process.env.JWT_SECRET || 'kavana-jwt-dev-secret-change-me';
if (!process.env.JWT_HMAC_SECRET && !process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_HMAC_SECRET is required');
  console.warn('⚠ JWT_HMAC_SECRET not set — using dev fallback (not for production)');
}

@Injectable()
export class AuthLoginService {
  async login(username: string, password: string): Promise<{ token: string; tenantId: string; userId: string; role: string; tenantName: string }> {
    const r = await postgresPool.query(
      `SELECT u.id, u.username, u.password_hash, u.role, u.tenant_id, t.name as tenant_name
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE LOWER(u.username) = LOWER($1)
       LIMIT 1`,
      [username],
    );

    if (r.rowCount === 0) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const user = r.rows[0];

    if (!this.verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const token = this.generateToken(user.tenant_id, user.id, user.role);

    return {
      token,
      tenantId: String(user.tenant_id),
      userId: user.id,
      role: user.role,
      tenantName: user.tenant_name,
    };
  }

  async loginByTenant(subdomain: string, username: string, password: string): Promise<{ token: string; tenantId: string; userId: string; role: string; tenantName: string }> {
    const r = await postgresPool.query(
      `SELECT u.id, u.username, u.password_hash, u.role, u.tenant_id, t.name as tenant_name
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE t.subdomain = $1 AND LOWER(u.username) = LOWER($2)
       LIMIT 1`,
      [subdomain, username],
    );

    if (r.rowCount === 0) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const user = r.rows[0];

    if (!this.verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const token = this.generateToken(user.tenant_id, user.id, user.role);

    return {
      token,
      tenantId: String(user.tenant_id),
      userId: user.id,
      role: user.role,
      tenantName: user.tenant_name,
    };
  }

  async getTenantBySubdomain(subdomain: string): Promise<{ id: string; name: string; status: string } | null> {
    const r = await postgresPool.query(
      `SELECT id, name, status FROM tenants WHERE subdomain = $1`,
      [subdomain],
    );
    if (r.rowCount === 0) return null;
    const row = r.rows[0];
    return { id: String(row.id), name: row.name, status: row.status };
  }

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash) return false;
    // Legacy SHA256 format: salt:hash (sin prefijo)
    if (!storedHash.startsWith('scrypt:')) {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) return false;
      const computed = createHash('sha256').update(salt + password).digest('hex');
      return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
    }
    // Current scrypt format: scrypt:salt:hash
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    const computed = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
  }

  private generateToken(tenantId: number, userId: string, role: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: userId,
      tenant_id: tenantId,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })).toString('base64url');
    const signature = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }
}
