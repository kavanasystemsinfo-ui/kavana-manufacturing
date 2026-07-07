import { describe, it, expect } from 'vitest';
import { AuthLoginService } from './auth-login.service.js';

describe('AuthLoginService', () => {
  it('should hash and verify passwords', () => {
    const service = new AuthLoginService();
    const hash = service.hashPassword('test123');
    expect(hash).toContain(':');
    expect(hash.length).toBeGreaterThan(32);
  });
});
