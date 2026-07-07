import { SetMetadata } from '@nestjs/common';
import type { KavanaRole } from './tenant-context.interface.js';

export const REQUIRED_ROLES_KEY = 'REQUIRED_ROLES';

export const RequireRole = (...roles: KavanaRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
