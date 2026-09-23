import { Controller, Get, Patch, Param, Body, Query, UseGuards, BadRequestException, Inject } from '@nestjs/common';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { TenantCapabilitiesService } from './tenant-capabilities.service.js';
import { RequireRole } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Controller('tenant')
export class TenantCapabilitiesController {
  constructor(@Inject(TenantCapabilitiesService) private readonly capabilities: TenantCapabilitiesService) {}

  // Lo pide el frontend en TODOS los paneles (feature flags y campos
  // personalizados). Sin política devolvía 403 y el panel caía a su almacén
  // local: un módulo desactivado seguía viéndose porque nadie se lo decía.
  @Get('capabilities')
  @RequireRole('operario', 'supervisor', 'tenant_admin')
  async getCapabilities() {
    const context = getTenantContext();
    const caps = await this.capabilities.getCapabilities(context.tenantId);

    // ponytail: serialize bigint as string for JSON transport.
    return {
      tenantId: caps.tenantId.toString(),
      governanceVersion: caps.governanceVersion,
      modules: caps.modules,
      quotas: caps.quotas,
      customFieldsSchema: caps.customFieldsSchema,
    };
  }

  @Patch('capabilities/modules/:moduleKey')
  @RequireRole('tenant_admin')
  @UseGuards(RolesGuard)
  async toggleModule(
    @Param('moduleKey') moduleKey: string,
    @Body('enabled') enabled: boolean,
  ) {
    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('The "enabled" body property must be a boolean.');
    }

    const context = getTenantContext();
    await this.capabilities.toggleModule(
      context.tenantId,
      context.userId,
      moduleKey,
      enabled,
    );

    return { success: true, message: `Module ${moduleKey} updated.` };
  }

  @Patch('capabilities/custom-fields')
  @RequireRole('tenant_admin')
  @UseGuards(RolesGuard)
  async updateCustomFieldsSchema(
    @Body() body: unknown,
  ) {
    const context = getTenantContext();
    await this.capabilities.updateCustomFieldsSchema(
      context.tenantId,
      context.userId,
      body,
    );

    return { success: true, message: 'Custom fields schema updated.' };
  }

  @Get('capabilities/audit')
  @RequireRole('tenant_admin')
  @UseGuards(RolesGuard)
  async getConfigAudit(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const context = getTenantContext();
    return this.capabilities.getConfigAudit(context.tenantId, { limit, offset, from, to });
  }

  @Get('tooling-types')
  @RequireRole('supervisor', 'tenant_admin')
  async getToolingTypes() {
    const context = getTenantContext();
    return this.capabilities.getToolingTypes(context.tenantId);
  }

  @Patch('tooling-types')
  @RequireRole('tenant_admin')
  @UseGuards(RolesGuard)
  async saveToolingTypes(@Body('types') types: string[]) {
    const context = getTenantContext();
    await this.capabilities.saveToolingTypes(context.tenantId, context.userId, types);
    return { success: true };
  }
}

