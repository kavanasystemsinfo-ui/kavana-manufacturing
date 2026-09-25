import { defineConfig, devices } from '@playwright/test';

// El E2E corre contra la aplicación de verdad: backend NestJS y frontend Vite.
// Los dos se arrancan solos (en CI desde cero, en local se reutiliza lo que ya
// esté levantado) y la base de datos la prepara el globalSetup.
const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? '3001';
const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT ?? '5173';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
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
      // El frontend habla con el backend a través del proxy de Vite, así que el
      // backend tiene que estar escuchando antes de la primera petición.
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
        // Identidad de plataforma del usuario kavana_admin que siembra el
        // e2e-setup: sin esta lista el guard del Global Admin deniega a todos.
        GLOBAL_ADMIN_USER_IDS:
          process.env.GLOBAL_ADMIN_USER_IDS ?? '00000000-0000-4000-8000-0000000000aa',
      },
    },
    {
      // El `npm` del PATH puede ser el shim de rtk (en el VPS muere con «dev:
      // not found») o el real (en el runner de GitHub, donde /usr/bin/npm NO
      // está garantizado). Se resuelve con `command -v` al vuelo: la primera
      // ruta que exista gana, y así la misma config corre en los dos sitios.
      command: 'npm_bin=$(command -v /usr/bin/npm || true); [ -x "$npm_bin" ] || npm_bin=$(command -v npm); "$npm_bin" run dev',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
