import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Inject } from '@nestjs/common';
import { GlobalAdminService } from './global-admin.service.js';

@Controller('global-admin')
export class GlobalAdminController {
  constructor(@Inject(GlobalAdminService) private readonly globalAdminService: GlobalAdminService) {}

  @Get('tenants')
  async listTenants() {
    return this.globalAdminService.listTenants();
  }

  @Get('tenants/:id')
  async getTenant(@Param('id') id: string) {
    return this.globalAdminService.getTenant(Number(id));
  }

  @Get('tenants/:id/stats')
  async getTenantStats(@Param('id') id: string) {
    return this.globalAdminService.getTenantStats(Number(id));
  }

  @Post('tenants')
  async createTenant(@Body() body: { id: number; name: string; status?: 'active' | 'suspended' | 'trial'; modules?: string[]; subdomain?: string }) {
    return this.globalAdminService.createTenant(body);
  }

  @Put('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() body: { name?: string; status?: 'active' | 'suspended' | 'trial' }) {
    return this.globalAdminService.updateTenant(Number(id), body);
  }

  @Delete('tenants/:id')
  async deleteTenant(@Param('id') id: string) {
    await this.globalAdminService.deleteTenant(Number(id));
    return { deleted: true };
  }

  @Patch('tenants/:id/modules/:moduleKey')
  async toggleModule(@Param('id') id: string, @Param('moduleKey') moduleKey: string, @Body() body: { enabled: boolean }) {
    return this.globalAdminService.toggleModule(Number(id), moduleKey, body.enabled);
  }
}
