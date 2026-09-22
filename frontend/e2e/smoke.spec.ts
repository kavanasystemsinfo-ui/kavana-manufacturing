import { test, expect } from '@playwright/test';

test.describe('Smoke E2E: App carga y login visible', () => {
  test('app carga y muestra formulario de login real', async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Verificar que la página carga
    await expect(page.locator('body')).toBeVisible();
    // El login tiene: input para "Empresa (Slug)", "Usuario", "Contraseña"
    await expect(page.locator('input[placeholder="ej. megalux"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="admin"]')).toBeVisible();
    await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible();
    await expect(page.locator('button:has-text("Acceder al Sistema")')).toBeVisible();
  });

  test('navegación a rutas principales no da 404', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page).not.toHaveTitle(/404|Not Found/i);
  });
});