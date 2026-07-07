import { describe, it, expect } from 'vitest';
import { GlobalAdminService } from './global-admin.service.js';

describe('GlobalAdminService', () => {
  it('should be importable', () => {
    expect(GlobalAdminService).toBeDefined();
  });
});
