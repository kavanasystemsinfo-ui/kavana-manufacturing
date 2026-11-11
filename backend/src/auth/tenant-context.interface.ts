export type KavanaRole = 'tenant_admin' | 'supervisor' | 'operario';

export interface TenantContext {
  tenantId: bigint;
  userId: string;
  role: KavanaRole;
  /** Sesión de la cuenta propia (superusuario oculto de la demo). Solo la firma el login. */
  owner?: boolean;
}
