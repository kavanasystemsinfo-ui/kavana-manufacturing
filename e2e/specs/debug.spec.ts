import { test, expect } from '@playwright/test';
import { setupMocks } from '../mocks/api.js';

const BASE = 'http://localhost:5173';

test('debug admin panel', async ({ page }) => {
  await setupMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem('kavana_dev_token', 'mock-token');
    localStorage.setItem('kavana_tenant_id', '1');
    localStorage.setItem('kavana_user_id', 'admin-dev-01');
    localStorage.setItem('kavana_role', 'tenant_admin');
    localStorage.setItem('kavana_tenant_name', 'Kavana Demo');
  });

  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('BODY:', JSON.stringify(bodyText));
  console.log('ERRORS:', JSON.stringify(errors));
  console.log('URL:', page.url());
});
