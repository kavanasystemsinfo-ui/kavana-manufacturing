import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Deja la base de datos con el esquema, el seed y los datos del flujo antes de
 * arrancar la aplicación. Sin DATABASE_URL no toca nada: el smoke sigue
 * corriendo, y el flujo completo fallará al no encontrar la orden.
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      '[e2e] Sin DATABASE_URL: no se prepara la base de datos. El flujo completo necesita una BD de pruebas.',
    );
    return;
  }
  execFileSync(process.execPath, [resolve(__dirname, '../../database/scripts/e2e-setup.js')], {
    stdio: 'inherit',
    env: process.env,
  });
}
