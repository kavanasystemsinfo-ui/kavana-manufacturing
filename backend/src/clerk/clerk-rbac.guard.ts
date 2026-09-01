import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { 
  REQUIRED_ROLES_KEY, 
  REQUIRED_AUTHORITY_SCOPE_KEY, 
  ClerkRole, 
  AuthorityScope,
  mapClerkRoleToKavana,
  getAuthorityScope,
  getMaxAuthorityScope,
  getRequiredKavanaRoles
} from './roles.decorator';

@Injectable()
export class ClerkRbacGuard implements CanActivate {
  private readonly logger = new Logger(ClerkRbacGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredClerkRoles = this.reflector.getAllAndOverride<ClerkRole[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredAuthorityScopes = this.reflector.getAllAndOverride<AuthorityScope[]>(REQUIRED_AUTHORITY_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles or scopes required, allow access
    if (!requiredClerkRoles?.length && !requiredAuthorityScopes?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const clerkAuth = request.clerkAuth;

    if (!clerkAuth) {
      this.logger.warn('No Clerk auth found on request');
      throw new ForbiddenException('Authentication required');
    }

    // Get user's Clerk role from token (stored in publicMetadata or org_role)
    const userClerkRole = this.extractClerkRole(clerkAuth);
    
    if (!userClerkRole) {
      this.logger.warn(`No Clerk role found for user: ${clerkAuth.sub}`);
      throw new ForbiddenException('Role not assigned');
    }

    // Check role-based access
    if (requiredClerkRoles?.length) {
      const hasRole = requiredClerkRoles.includes(userClerkRole);
      if (!hasRole) {
        this.logger.warn(
          `Access denied for user ${clerkAuth.sub}: ` +
          `required roles [${requiredClerkRoles.join(', ')}], ` +
          `user has role [${userClerkRole}]`
        );
        throw new ForbiddenException('Insufficient role permissions');
      }
    }

    // Check authority scope-based access
    if (requiredAuthorityScopes?.length) {
      const userScope = getAuthorityScope(userClerkRole);
      const maxRequiredScope = getMaxAuthorityScope(requiredAuthorityScopes);
      
      // User's scope must be >= required scope (more permissive)
      const hierarchy: AuthorityScope[] = ['global', 'company', 'department', 'self'];
      const userScopeIndex = hierarchy.indexOf(userScope);
      const requiredScopeIndex = hierarchy.indexOf(maxRequiredScope);
      
      if (userScopeIndex > requiredScopeIndex) {
        this.logger.warn(
          `Access denied for user ${clerkAuth.sub}: ` +
          `required authority scope [${maxRequiredScope}], ` +
          `user has scope [${userScope}]`
        );
        throw new ForbiddenException('Insufficient authority scope');
      }
    }

    // Attach mapped Kavana role for downstream use
    request.kavanaRole = mapClerkRoleToKavana(userClerkRole);
    request.authorityScope = getAuthorityScope(userClerkRole);

    return true;
  }

  private extractClerkRole(payload: Record<string, unknown>): ClerkRole | null {
    // Check org_role claim first (set by Clerk organization membership)
    if (payload.org_role && typeof payload.org_role === 'string') {
      const role = payload.org_role as ClerkRole;
      if (['admin', 'director', 'tecnico', 'comercial', 'viewer'].includes(role)) {
        return role;
      }
    }

    // Check publicMetadata for custom role
    if (payload.public_metadata && typeof payload.public_metadata === 'object') {
      const meta = payload.public_metadata as Record<string, unknown>;
      if (meta.clerkRole && typeof meta.clerkRole === 'string') {
        const role = meta.clerkRole as ClerkRole;
        if (['admin', 'director', 'tecnico', 'comercial', 'viewer'].includes(role)) {
          return role;
        }
      }
    }

    // Check unsafeMetadata as fallback
    if (payload.unsafe_metadata && typeof payload.unsafe_metadata === 'object') {
      const meta = payload.unsafe_metadata as Record<string, unknown>;
      if (meta.clerkRole && typeof meta.clerkRole === 'string') {
        const role = meta.clerkRole as ClerkRole;
        if (['admin', 'director', 'tecnico', 'comercial', 'viewer'].includes(role)) {
          return role;
        }
      }
    }

    // Default to viewer if no role found
    return 'viewer';
  }
}