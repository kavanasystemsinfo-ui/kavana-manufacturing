import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getTenantContext } from './tenant-context.storage.js';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';
import type { KavanaRole } from './tenant-context.interface.js';

// Guard de roles GLOBAL (APP_GUARD, registrado en tenant-capabilities.module).
// Fail-closed: si un endpoint NO declara @RequireRole, se deniega el acceso.
// Antes (hasta 2026-08-21) el comportamiento era opt-in: sin decorador el
// guard devolvía true, y cualquier JWT válido (incluido un operario) podía
// llamar endpoints sin proteger — escalada operario → tenant_admin vía
// PUT /users/:id, y administración total de tenants vía /global-admin.
//
// Excepciones declaradas por ruta en PUBLIC_ROUTES (login, health y las dos
// rutas públicas por diseño: ai-advisor demo y upload móvil de incidencias).
// El resto exige @RequireRole explícito en el controller.
const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  'auth', // login: es el endpoint que emite el token
  'health',
  'ai-advisor', // demo pública con rate limit propio
]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<KavanaRole[] | undefined>(
      REQUIRED_ROLES_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest<{ path?: string; route?: { path?: string } }>();
    const routePath = request?.route?.path ?? request?.path ?? '';
    const isPublic = [...PUBLIC_ROUTES].some((prefix) => routePath.includes(`/${prefix}`));

    // Rutas públicas: sin exigencia de rol.
    if (isPublic) {
      return true;
    }

    // Fail-closed: sin @RequireRole explícito, denegar.
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException(
        'Endpoint sin política de roles declarada. Acceso denegado (fail-closed).',
      );
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
