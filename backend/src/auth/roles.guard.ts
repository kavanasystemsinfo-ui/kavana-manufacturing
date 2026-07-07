import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getTenantContext } from './tenant-context.storage.js';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';
import type { KavanaRole } from './tenant-context.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<KavanaRole[] | undefined>(
      REQUIRED_ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const tenantContext = getTenantContext();

    if (!requiredRoles.includes(tenantContext.role)) {
      throw new ForbiddenException(
        `Access denied. Requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
