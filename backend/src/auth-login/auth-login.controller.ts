import { Controller, Post, Body, Get, Param, Inject, Req, HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthLoginService } from './auth-login.service.js';

// FIX 2026-08-21 (P1): rate limit de login (10 intentos / 5 min / IP).
// Mismo patrón en memoria que el rate limit del ai-advisor: suficiente para
// 1 réplica; migrar a Redis si se escala. Ventana deslizante por IP.
const loginAttempts = new Map<string, number[]>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function clientIp(req: Request): string {
  const fwd = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  return fwd || req.socket?.remoteAddress || 'unknown';
}

function enforceLoginRateLimit(req: Request): void {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (loginAttempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    throw new HttpException('Demasiados intentos de login. Espera unos minutos.', 429);
  }
  recent.push(now);
  loginAttempts.set(ip, recent);
}

@Controller('auth')
export class AuthLoginController {
  constructor(@Inject(AuthLoginService) private readonly authLoginService: AuthLoginService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }, @Req() req: Request) {
    enforceLoginRateLimit(req);
    return this.authLoginService.login(body.username, body.password);
  }

  @Post('login-by-tenant')
  async loginByTenant(@Body() body: { subdomain: string; username: string; password: string }, @Req() req: Request) {
    enforceLoginRateLimit(req);
    return this.authLoginService.loginByTenant(body.subdomain, body.username, body.password);
  }

  @Get('tenant/:subdomain')
  async getTenant(@Param('subdomain') subdomain: string) {
    const tenant = await this.authLoginService.getTenantBySubdomain(subdomain);
    if (!tenant) {
      return { found: false };
    }
    return { found: true, ...tenant };
  }
}
