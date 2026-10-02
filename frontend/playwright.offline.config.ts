import { defineConfig, devices } from '@playwright/test';

/**
 * Comprobación del funcionamiento sin red, contra la aplicación construida.
 *
 * El servidor de desarrollo sirve los módulos sueltos, así que ahí no se puede
 * juzgar lo que recibe el cliente. Aquí se construye la aplicación y se sirve
 * con la vista previa, que es lo más parecido al despliegue: es donde el
 * armazón cacheado y el trabajador de servicio demuestran lo que aguantan.
 *
 * Se ejecuta aparte del resto del E2E (que sí va contra el servidor de
 * desarrollo) y en la integración continua corre después, sobre el mismo
 * backend compilado.
 */
const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? '3101';
const FRONTEND_PORT = process.env.E2E_OFFLINE_PORT ?? '4174';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'offline-first.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../backend',
      url: `http://localhost:${BACKEND_PORT}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: BACKEND_PORT,
        ALLOW_MOCK_AUTH: 'false',
        METRICS_PORT: '0',
        JWT_SECRET: process.env.JWT_SECRET ?? 'e2e-secret',
        JWT_HMAC_SECRET: process.env.JWT_HMAC_SECRET ?? 'e2e-secret',
        // La vista previa sirve la aplicación construida en otro puerto, y el
        // backend solo acepta los orígenes que se le declaran: sin esto, el
        // navegador recibe «Origen no permitido por CORS» al entrar.
        FRONTEND_ORIGIN:
          process.env.FRONTEND_ORIGIN ?? `http://localhost:${FRONTEND_PORT}`,
        GLOBAL_ADMIN_USER_IDS:
          process.env.GLOBAL_ADMIN_USER_IDS ?? '00000000-0000-4000-8000-0000000000aa',
        // Igual que en el E2E principal: la suite entra en ráfaga desde la misma
        // IP y el límite de producción (10 por 5 minutos) la dejaría fuera.
        LOGIN_MAX_ATTEMPTS: process.env.LOGIN_MAX_ATTEMPTS ?? '500',
      },
    },
    {
      command: 'npm run build && npx vite preview --port 4174 --strictPort',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 240000,
      env: {
        ...process.env,
        VITE_API_TARGET: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
});
