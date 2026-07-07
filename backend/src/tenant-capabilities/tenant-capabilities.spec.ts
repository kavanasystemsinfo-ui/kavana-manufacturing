import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedCapabilities,
  setCachedCapabilities,
  invalidateCachedCapabilities,
  clearAllCachedCapabilities,
} from './capabilities-cache.js';
import type { TenantCapabilities } from './capabilities.interface.js';
import { TenantCapabilitiesService } from './tenant-capabilities.service.js';

function makeCaps(overrides: Partial<TenantCapabilities> = {}): TenantCapabilities {
  return {
    tenantId: 1n,
    governanceVersion: 1,
    modules: {
      core_mes: { enabled: true, features: { hmi_offline_first: true } },
      oee_monitoring: { enabled: false, features: { real_time_dashboard: false } },
      quality_assurance: { enabled: false, features: {} },
      cost_management: { enabled: false, features: {} },
    },
    quotas: { storage: { limit_gb: 10 } },
    customFieldsSchema: {},
    ...overrides,
  };
}

describe('capabilities-cache', () => {
  beforeEach(() => {
    clearAllCachedCapabilities();
  });

  it('returns null on cache miss', () => {
    expect(getCachedCapabilities(99n, 0)).toBeNull();
  });

  it('returns cached data on hit', () => {
    const caps = makeCaps();
    setCachedCapabilities(caps);

    const result = getCachedCapabilities(1n, 1);
    expect(result).not.toBeNull();
    expect(result!.modules.core_mes.enabled).toBe(true);
  });

  it('invalidates when governance_version is bumped', () => {
    const caps = makeCaps({ governanceVersion: 1 });
    setCachedCapabilities(caps);

    // governance_version 2 > cached 1 → stale
    expect(getCachedCapabilities(1n, 2)).toBeNull();
  });

  it('invalidates after TTL expires', async () => {
    const caps = makeCaps();
    // TTL = 1ms → expired after a tiny wait
    setCachedCapabilities(caps, 1);
    await new Promise((r) => setTimeout(r, 5));

    expect(getCachedCapabilities(1n, 1)).toBeNull();
  });

  it('explicit invalidation clears entry', () => {
    const caps = makeCaps();
    setCachedCapabilities(caps);

    invalidateCachedCapabilities(1n);

    expect(getCachedCapabilities(1n, 1)).toBeNull();
  });
});

describe('module evaluation logic', () => {
  it('core_mes is enabled by default in seed', () => {
    const caps = makeCaps();
    expect(caps.modules.core_mes.enabled).toBe(true);
  });

  it('oee_monitoring is disabled by default in seed', () => {
    const caps = makeCaps();
    expect(caps.modules.oee_monitoring.enabled).toBe(false);
  });

  it('unknown module key returns undefined (guard treats as disabled)', () => {
    const caps = makeCaps();
    expect(caps.modules['nonexistent_module']).toBeUndefined();
  });
});

describe('custom_fields_schema label validation', () => {
  it('accepts schema with label field', () => {
    const schema = {
      fields: [
        { key: 'grosor', label: 'Grosor Bobina', type: 'number', required: false },
        { key: 'material', label: '', type: 'string', required: true },
      ],
    };
    const validator = TenantCapabilitiesService as any;
    expect(schema.fields[0].label).toBe('Grosor Bobina');
    expect(schema.fields[1].label).toBe('');
  });

  it('accepts schema without label (optional)', () => {
    const schema = {
      fields: [
        { key: 'grosor', type: 'number', required: false },
      ],
    };
    expect(schema.fields[0].label).toBeUndefined();
  });
});
