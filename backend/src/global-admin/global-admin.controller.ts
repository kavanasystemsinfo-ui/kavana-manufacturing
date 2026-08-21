import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Inject, ForbiddenException, UseGuards } from '@nestjs/common';
import { GlobalAdminService } from './global-admin.service.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { RequireRole } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

// FIX 2026-08-21 (P0): este controller administraba TODOS los tenants sin
// ningún control de roles (listar, crear, suspender, borrar con CASCADE).
// El modelo de roles del sistema no tiene un rol 'global_admin' en el JWT,
// así que la autorización se hace por identidad de plataforma: solo el
// usuario de plataforma configurado en GLOBAL_ADMIN_USER_IDS (lista de ids
// separados por comas) puede entrar. Fail-closed: si no está configurado,
// nadie accede.
const GLOBAL_ADMIN_USER_IDS = (process.env.GLOBAL_ADMIN_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function requirePlatformAdmin(): void {
  const ctx = getTenantContext();
  if (GLOBAL_ADMIN_USER_IDS.length === 0 || !GLOBAL_ADMIN_USER_IDS.includes(ctx.userId)) {
    throw new ForbiddenException('Acceso restringido al administrador de plataforma.');
  }
}

// FIX ronda 2: @RequireRole('tenant_admin') es SOLO la llave del guard global
// (sin decorador el fail-closed deniega antes de llegar aquí). La barrera
// REAL sigue siendo requirePlatformAdmin() contra GLOBAL_ADMIN_USER_IDS.
@Controller('global-admin')
@RequireRole('tenant_admin')
@UseGuards(RolesGuard)
export class GlobalAdminController {
  constructor(@Inject(GlobalAdminService) private readonly globalAdminService: GlobalAdminService) {}

  @Get('tenants')
  async listTenants() {
    requirePlatformAdmin();
    return this.globalAdminService.listTenants();
  }

  @Get('tenants/:id')
  async getTenant(@Param('id') id: string) {
    requirePlatformAdmin();
    return this.globalAdminService.getTenant(Number(id));
  }

  @Get('tenants/:id/stats')
  async getTenantStats(@Param('id') id: string) {
    requirePlatformAdmin();
    return this.globalAdminService.getTenantStats(Number(id));
  }

  @Post('tenants')
  async createTenant(@Body() body: { id: number; name: string; status?: 'active' | 'suspended' | 'trial'; modules?: string[]; subdomain?: string }) {
    requirePlatformAdmin();
    return this.globalAdminService.createTenant(body);
  }

  @Put('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() body: { name?: string; status?: 'active' | 'suspended' | 'trial' }) {
    requirePlatformAdmin();
    return this.globalAdminService.updateTenant(Number(id), body);
  }

  @Delete('tenants/:id')
  async deleteTenant(@Param('id') id: string) {
    requirePlatformAdmin();
    await this.globalAdminService.deleteTenant(Number(id));
    return { deleted: true };
  }

  @Patch('tenants/:id/modules/:moduleKey')
  async toggleModule(@Param('id') id: string, @Param('moduleKey') moduleKey: string, @Body() body: { enabled: boolean }) {
    requirePlatformAdmin();
    return this.globalAdminService.toggleModule(Number(id), moduleKey, body.enabled);
  }
}
