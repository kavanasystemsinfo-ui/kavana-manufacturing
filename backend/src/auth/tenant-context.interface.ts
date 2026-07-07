export type KavanaRole = 'tenant_admin' | 'supervisor' | 'operario';

export interface TenantContext {
  tenantId: bigint;
  userId: string;
  role: KavanaRole;
}
