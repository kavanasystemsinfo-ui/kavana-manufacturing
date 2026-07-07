export interface TenantCapabilities {
  tenantId: bigint;
  governanceVersion: number;
  modules: Record<string, { enabled: boolean; features: Record<string, unknown> }>;
  quotas: Record<string, unknown>;
  customFieldsSchema: Record<string, unknown>;
}

// ponytail: hardLimits deliberately excluded from frontend-facing capabilities.
// Upgrade path: expose a super_admin-only endpoint if hard_limits visibility is needed.
