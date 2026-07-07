import { Injectable, UnauthorizedException } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

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
    const hash = createHash('sha256').update(salt + password).digest('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) {
      return false;
    }
    const computed = createHash('sha256').update(salt + password).digest('hex');
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
    const signature = createHash('sha256').update(`${header}.${payload}.kavana-secret`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }
}
