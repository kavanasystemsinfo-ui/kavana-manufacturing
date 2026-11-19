import { randomBytes, scryptSync } from 'node:crypto';

/**
 * Hash de contraseña para ALTA y CAMBIO de usuario: scrypt con formato
 * `scrypt:salt:hash`. Es el mismo que usa AuthLoginService; el formato legacy
 * sha256 (`salt:hash`) solo se acepta al verificar y se re-hashea en el login.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}
