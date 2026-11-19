import { describe, expect, it } from 'vitest';
import { hashPassword } from './password-hash.js';
import { AuthLoginService } from '../auth-login/auth-login.service.js';

describe('hashPassword (alta y cambio de usuario)', () => {
  it('genera formato scrypt:salt:hash de 3 partes', () => {
    const h = hashPassword('clave-1234');
    expect(h.split(':')).toHaveLength(3);
    expect(h.startsWith('scrypt:')).toBe(true);
  });

  it('usa sal distinta cada vez', () => {
    expect(hashPassword('misma')).not.toBe(hashPassword('misma'));
  });

  it('el login lo verifica y rechaza otra contraseña', () => {
    const service = new AuthLoginService();
    const h = hashPassword('clave-1234');
    expect(service['verifyPassword']('clave-1234', h)).toBe(true);
    expect(service['verifyPassword']('otra', h)).toBe(false);
  });
});
