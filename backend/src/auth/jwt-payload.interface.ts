import type { KavanaRole } from './tenant-context.interface.js';

export interface JwtPayload {
  sub: string;
  tenant_id?: string;
  'custom:tenant_id'?: string;
  role?: KavanaRole;
  'custom:role'?: KavanaRole;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}
