import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { REQUIRED_FEATURE_KEY } from './require-feature.decorator.js';
import { TenantCapabilitiesService } from './tenant-capabilities.service.js';

@Injectable()
export class RequireFeatureGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TenantCapabilitiesService) private readonly capabilities: TenantCapabilitiesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.get<string | undefined>(
      REQUIRED_FEATURE_KEY,
      context.getHandler(),
    );

    // No decorator → no restriction
    if (!requiredModule) {
      return true;
    }

    const tenantContext = getTenantContext();
    const enabled = await this.capabilities.isModuleEnabled(
      tenantContext.tenantId,
      requiredModule,
    );

    if (!enabled) {
      throw new ForbiddenException(
        `Module '${requiredModule}' is not enabled for this tenant.`,
      );
    }

    return true;
  }
}
