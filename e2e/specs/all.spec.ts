import { test, expect } from '@playwright/test';
import { setupMocks } from '../mocks/api.js';

const BASE = 'http://localhost:5173';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('muestra el formulario con logo y campos', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('KAVANA MES')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('ej. megalux')).toBeVisible();
    await expect(page.getByText('Acceder al Sistema')).toBeVisible();
  });

  test('escribe en los campos del formulario', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('ej. megalux').fill('megalux');
    await page.getByPlaceholder('admin').fill('admin');
    await expect(page.getByPlaceholder('ej. megalux')).toHaveValue('megalux');
    await expect(page.getByPlaceholder('admin')).toHaveValue('admin');
  });

  test('botón deshabilitado con campos vacíos', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Acceder al Sistema')).toBeDisabled();
  });

  test('botón habilitado con campos rellenos', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('ej. megalux').fill('demo');
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('pass');
    await expect(page.getByText('Acceder al Sistema')).toBeEnabled();
  });
});

test.describe('Paneles', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem('kavana_dev_token', 'mock-token');
      localStorage.setItem('kavana_tenant_id', '1');
      localStorage.setItem('kavana_user_id', 'admin-dev-01');
      localStorage.setItem('kavana_role', 'tenant_admin');
      localStorage.setItem('kavana_tenant_name', 'Kavana Demo');
    });
  });

  test('operario: selección de órdenes', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Seleccionar Orden')).toBeVisible({ timeout: 10000 });
  });

  test('operario: click orden y formulario', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Perfil 20x20')).toBeVisible({ timeout: 10000 });
    await page.getByText('Perfil 20x20').click();
    await expect(page.getByText('Registrar Bloque de Tiempo')).toBeVisible({ timeout: 5000 });
  });

  test('operario: campos del formulario', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Perfil 20x20')).toBeVisible({ timeout: 10000 });
    await page.getByText('Perfil 20x20').click();
    await expect(page.getByText('Registrar Bloque de Tiempo')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Producidos')).toBeVisible();
    await expect(page.getByText('Defectos')).toBeVisible();
  });

  test('supervisor: panel carga', async ({ page }) => {
    await page.goto(BASE + '/supervisor', { waitUntil: 'networkidle' });
    // Classic theme heading is "Panel de Supervisión"
    await expect(page.getByText('Panel de Supervisión')).toBeVisible({ timeout: 15000 });
  });

  test('admin: tabs principales visibles', async ({ page }) => {
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    // Use role=button to target the tab buttons specifically
    await expect(page.getByRole('button', { name: 'Usuarios', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Puestos', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Modelos', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Órdenes', exact: true })).toBeVisible();
  });

  test('admin: datos usuarios mock', async ({ page }) => {
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    // Check that user data rows rendered (they have role="tenant_admin"/"operario"/etc)
    await expect(page.getByText('admin', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('operario1', { exact: true })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem('kavana_dev_token', 'mock-token');
      localStorage.setItem('kavana_tenant_id', '1');
      localStorage.setItem('kavana_user_id', 'admin-dev-01');
      localStorage.setItem('kavana_role', 'tenant_admin');
      localStorage.setItem('kavana_tenant_name', 'Kavana Demo');
    });
  });

  test('por defecto classic', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Seleccionar Orden')).toBeVisible({ timeout: 10000 });
    expect(await page.evaluate(() => localStorage.getItem('kavana_theme'))).toBeNull();
  });

  test('toggle cambia a moderno', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Seleccionar Orden')).toBeVisible({ timeout: 10000 });

    // ThemeToggle renders "Clásico" and "Moderno" buttons
    // Click "Moderno" to switch from classic to modern
    await page.getByText('Moderno').first().click();

    expect(await page.evaluate(() => localStorage.getItem('kavana_theme'))).toBe('modern');
  });
});
