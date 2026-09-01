import { SetMetadata } from '@nestjs/common';

export type ClerkRole = 'admin' | 'director' | 'tecnico' | 'comercial' | 'viewer';

export type KavanaRole = 'tenant_admin' | 'supervisor' | 'operario';

export type AuthorityScope = 'global' | 'company' | 'department' | 'self';

export interface RoleMapping {
  clerkRole: ClerkRole;
  kavanaRole: KavanaRole;
  authorityScope: AuthorityScope;
}

export const ROLE_MAPPING: RoleMapping[] = [
  { clerkRole: 'admin', kavanaRole: 'tenant_admin', authorityScope: 'global' },
  { clerkRole: 'director', kavanaRole: 'tenant_admin', authorityScope: 'company' },
  { clerkRole: 'tecnico', kavanaRole: 'supervisor', authorityScope: 'department' },
  { clerkRole: 'comercial', kavanaRole: 'operario', authorityScope: 'department' },
  { clerkRole: 'viewer', kavanaRole: 'operario', authorityScope: 'self' },
];

export const REQUIRED_ROLES_KEY = 'REQUIRED_ROLES';
export const REQUIRED_AUTHORITY_SCOPE_KEY = 'REQUIRED_AUTHORITY_SCOPE';

export const RequireRole = (...roles: ClerkRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

export const RequireAuthorityScope = (...scopes: AuthorityScope[]) =>
  SetMetadata(REQUIRED_AUTHORITY_SCOPE_KEY, scopes);

export function mapClerkRoleToKavana(clerkRole: ClerkRole): KavanaRole {
  const mapping = ROLE_MAPPING.find(m => m.clerkRole === clerkRole);
  return mapping?.kavanaRole ?? 'operario';
}

export function getAuthorityScope(clerkRole: ClerkRole): AuthorityScope {
  const mapping = ROLE_MAPPING.find(m => m.clerkRole === clerkRole);
  return mapping?.authorityScope ?? 'self';
}

export function getRequiredKavanaRoles(clerkRoles: ClerkRole[]): KavanaRole[] {
  return clerkRoles.map(mapClerkRoleToKavana);
}

export function getMaxAuthorityScope(scopes: AuthorityScope[]): AuthorityScope {
  const hierarchy: AuthorityScope[] = ['global', 'company', 'department', 'self'];
  return scopes.reduce((max, scope) => 
    hierarchy.indexOf(scope) < hierarchy.indexOf(max) ? scope : max
  , 'self');
}