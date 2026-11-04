import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['record.ts'],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    viewport: { width: 1920, height: 1080 },
    trace: 'on',
    headless: true,
    launchOptions: {
      args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process', '--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 180000,
});