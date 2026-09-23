import { test, expect, type Page } from '@playwright/test';

/**
 * Un operario sin puesto asignado no puede arreglarlo solo: su panel tiene que
 * decirle a quién pedírselo. Antes decía «No hay órdenes asignadas a tu puesto»,
 * que es cierto pero le deja sin saber qué hacer ni con quién hablar.
 *
 * El operario sin puesto (1095) lo crea `database/scripts/e2e-setup.js`.
 */

const TENANT = 'demo';
const SIN_PUESTO = { usuario: '1095', password: 'kavana' };

async function login(page: Page, usuario: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('ej. megalux').fill(TENANT);
  await page.getByPlaceholder('admin').fill(usuario);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Acceder al Sistema' }).click();
  await page.waitForURL(new RegExp(`/${TENANT}(/|$)`));
}

test.describe('Operario sin puesto asignado', () => {
  test.setTimeout(60000);

  test('su panel le dice a quién pedir el puesto, no que no haya órdenes', async ({ page }) => {
    await login(page, SIN_PUESTO.usuario, SIN_PUESTO.password);
    // Sin orden seleccionada el panel muestra la pantalla de selección: el
    // heading «Panel de Operario» solo aparece después de elegir una orden.
    await expect(page.getByRole('heading', { name: 'Seleccionar Orden' })).toBeVisible();

    await expect(page.getByText('Sin puesto asignado')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Pídeselo a tu supervisor/)).toBeVisible();

    // El mensaje viejo era el problema: describe el síntoma y no la causa.
    await expect(page.getByText('No hay órdenes asignadas a tu puesto')).toBeHidden();
  });
});
