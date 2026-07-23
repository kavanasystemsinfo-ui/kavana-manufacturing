import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('login page loads correctly', async ({ page }) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await expect(page.getByText('KAVANA MES')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Acceder al Sistema')).toBeVisible();
});

test('can fill login form', async ({ page }) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('ej. megalux').fill('test');
  await page.getByPlaceholder('admin').fill('user');
  await expect(page.getByPlaceholder('ej. megalux')).toHaveValue('test');
  await expect(page.getByPlaceholder('admin')).toHaveValue('user');
});
