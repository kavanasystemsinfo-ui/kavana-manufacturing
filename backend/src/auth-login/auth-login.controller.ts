import { Controller, Post, Body, Get, Param, Inject } from '@nestjs/common';
import { AuthLoginService } from './auth-login.service.js';

@Controller('auth')
export class AuthLoginController {
  constructor(@Inject(AuthLoginService) private readonly authLoginService: AuthLoginService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.authLoginService.login(body.username, body.password);
  }

  @Post('login-by-tenant')
  async loginByTenant(@Body() body: { subdomain: string; username: string; password: string }) {
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
