import { test, expect, type Page } from '@playwright/test';

/**
 * Lo que cubría la suite E2E antigua (la de `e2e/` en la raíz, que mockeaba la
 * API) y que valía la pena conservar antes de borrarla: que el tema moderno
 * pinte y que el tercer rol, el administrador, entre y vea su panel. El resto de
 * aquella suite (formulario de login, campos, paneles con datos falsos) ya lo
 * cubre esta suite contra la aplicación real.
 */

const TENANT = 'demo';

async function login(page: Page, usuario: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('ej. megalux').fill(TENANT);
  await page.getByPlaceholder('admin').fill(usuario);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Acceder al Sistema' }).click();
  await page.waitForURL(new RegExp(`/${TENANT}(/|$)`));
}

test.describe('Tema y rol de administración', () => {
  test.setTimeout(60000);

  test('el tema moderno pinta el panel del operario, no solo el clásico', async ({ page }) => {
    await login(page, '1094', 'kavana');
    await expect(page.getByRole('heading', { name: 'Seleccionar Orden' })).toBeVisible();

    // El panel moderno se reconoce por el texto alternativo de su logo («Logo
    // Kavana»; el clásico usa «Logo»), así que esto comprueba que ha repintado de
    // verdad y no se ha quedado el clásico.
    await page.getByRole('button', { name: 'Kavana', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Logo Kavana' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Seleccionar Orden' })).toBeVisible();

    // El tema se recuerda entre sesiones: al recargar sigue en moderno.
    await page.reload();
    await expect(page.getByRole('img', { name: 'Logo Kavana' })).toBeVisible({ timeout: 15000 });
  });

  test('el administrador entra y ve su panel', async ({ page }) => {
    await login(page, 'admin', 'admin123');

    await expect(page.getByRole('heading', { name: 'Panel de Administración' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: 'Usuarios' })).toBeVisible();
  });
});
