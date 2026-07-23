import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Login Page - no mocks', () => {
  test('muestra el formulario con logo y campos', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('KAVANA MES')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('ej. megalux')).toBeVisible();
    await expect(page.getByPlaceholder('admin')).toBeVisible();
    await expect(page.getByText('Acceder al Sistema')).toBeVisible();
  });

  test('botón deshabilitado con campos vacíos', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Acceder al Sistema')).toBeDisabled();
  });
});

test.describe('Paneles con mock auth', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/production/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/tenant/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tenantId: '1', governanceVersion: 1, modules: {}, quotas: {}, customFieldsSchema: {} }) });
    });
    await page.route('**/health', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    });
    
    // Set auth in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('kavana_dev_token', 'mock-token');
      localStorage.setItem('kavana_tenant_id', '1');
      localStorage.setItem('kavana_user_id', 'admin-dev-01');
      localStorage.setItem('kavana_role', 'tenant_admin');
      localStorage.setItem('kavana_tenant_name', 'Kavana Demo');
    });
  });

  test('operario: carga selección de órdenes (classic)', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Seleccionar Orden')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('Buscar por modelo, puesto o código...')).toBeVisible();
  });

  test('supervisor: panel carga', async ({ page }) => {
    await page.goto(BASE + '/supervisor', { waitUntil: 'networkidle' });
    await expect(page.getByText('Panel Supervisor')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('+ Nueva Orden')).toBeVisible();
  });

  test('admin: tabs principales', async ({ page }) => {
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await expect(page.getByText('Usuarios')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Puestos')).toBeVisible();
    await expect(page.getByText('Modelos')).toBeVisible();
  });
});
