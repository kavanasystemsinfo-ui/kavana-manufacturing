import { describe, it, expect } from 'vitest';
import { versionContext, contextChanged } from '../ai-advisor/context-version.js';

describe('context-version', () => {
  it('generates a 12-char hex hash from context content', () => {
    const cv = versionContext('tenant-1', '{"orders": [{"id": 1}]}', 1, 3, 0, 5);
    expect(cv.hash).toHaveLength(12);
    expect(/^[a-f0-9]{12}$/.test(cv.hash)).toBe(true);
  });

  it('produces the same hash for identical content', () => {
    const content = '{"orders": [{"id": 1}], "oee": []}';
    const a = versionContext('tenant-1', content, 1, 0, 0, 0);
    const b = versionContext('tenant-1', content, 1, 0, 0, 0);
    expect(a.hash).toBe(b.hash);
  });

  it('produces different hashes for different content', () => {
    const a = versionContext('tenant-1', '{"orders": [{"id": 1}]}', 1, 0, 0, 0);
    const b = versionContext('tenant-1', '{"orders": [{"id": 2}]}', 1, 0, 0, 0);
    expect(a.hash).not.toBe(b.hash);
  });

  it('detects context change via contextChanged()', () => {
    const v1 = versionContext('tenant-1', '{"a": 1}', 0, 0, 0, 0);
    const v2 = versionContext('tenant-1', '{"a": 2}', 0, 0, 0, 0);
    expect(contextChanged(v1, v2)).toBe(true);
  });

  it('detects no change for identical context', () => {
    const content = 'identical';
    const v1 = versionContext('tenant-1', content, 0, 0, 0, 0);
    const v2 = versionContext('tenant-1', content, 0, 0, 0, 0);
    expect(contextChanged(v1, v2)).toBe(false);
  });

  it('includes record counts and tenant in the version', () => {
    const cv = versionContext('tenant-42', '{}', 7, 3, 2, 15);
    expect(cv.tenantId).toBe('tenant-42');
    expect(cv.orderCount).toBe(7);
    expect(cv.oeeRecordCount).toBe(3);
    expect(cv.qualityRecordCount).toBe(2);
    expect(cv.workblockCount).toBe(15);
  });

  it('includes a valid ISO timestamp', () => {
    const cv = versionContext('t', '{}', 0, 0, 0, 0);
    expect(() => new Date(cv.generatedAt)).not.toThrow();
    expect(new Date(cv.generatedAt).getTime()).toBeGreaterThan(Date.now() - 5000);
  });
});
