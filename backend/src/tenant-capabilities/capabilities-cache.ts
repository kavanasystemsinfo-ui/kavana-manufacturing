import type { TenantCapabilities } from './capabilities.interface.js';

interface CacheEntry {
  data: TenantCapabilities;
  governanceVersion: number;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000;

// ponytail: L1 only. Upgrade to L2 Redis when multi-instance deployment requires shared cache.
// For single-process MVP, Map + TTL is sufficient and zero-dependency.
const cache = new Map<string, CacheEntry>();

export function getCachedCapabilities(
  tenantId: bigint,
  currentGovernanceVersion: number,
): TenantCapabilities | null {
  const key = tenantId.toString();
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  const expired = Date.now() > entry.expiresAt;
  const stale = currentGovernanceVersion > entry.governanceVersion;

  if (expired || stale) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCachedCapabilities(
  capabilities: TenantCapabilities,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  const key = capabilities.tenantId.toString();

  cache.set(key, {
    data: capabilities,
    governanceVersion: capabilities.governanceVersion,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCachedCapabilities(tenantId: bigint): void {
  cache.delete(tenantId.toString());
}

// ponytail: exposed for tests only.
export function clearAllCachedCapabilities(): void {
  cache.clear();
}
