import { test, expect, type Page } from '@playwright/test';

/**
 * El supervisor crea una orden desde la interfaz.
 *
 * Este flujo estaba roto y no lo cubría nada: el formulario ofrecía los
 * desplegables de Modelo y Puesto, pero los dos catálogos exigían rol de
 * administrador, así que el supervisor recibía 403 y las listas salían vacías.
 * Podía pulsar "+ Nueva Orden" y no había nada que elegir.
 *
 * Lo que se comprueba aquí es lo que fallaba: que los dos desplegables tengan
 * catálogo, que se pueda crear la orden y que aparezca en su lista.
 */

const TENANT = 'demo';
const SUPERVISOR = { usuario: '047', password: 'kavana' };

const MODELO = 'Modelo E2E';
const PUESTO = 'Puesto E2E';
const CANTIDAD = '25';

async function login(page: Page, usuario: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('ej. megalux').fill(TENANT);
  await page.getByPlaceholder('admin').fill(usuario);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Acceder al Sistema' }).click();
  await page.waitForURL(new RegExp(`/${TENANT}(/|$)`));
}

test.describe('Supervisor: alta de orden desde la interfaz', () => {
  test.setTimeout(60000);

  test('los catálogos se cargan y la orden creada aparece en la lista', async ({ page }) => {
    await login(page, SUPERVISOR.usuario, SUPERVISOR.password);
    await expect(page.getByRole('heading', { name: 'Panel de Supervisión' })).toBeVisible();

    await page.getByRole('button', { name: '+ Nueva Orden' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva Orden de Producción' })).toBeVisible();

    // Los dos desplegables que salían vacíos: si vuelve el 403, esto falla.
    // El texto va anclado porque una base de pruebas acumula puestos de corridas
    // anteriores y "Puesto E2E" es prefijo de "Puesto E2E <código>".
    const desplegableModelo = page.locator('select').nth(0);
    const desplegablePuesto = page.locator('select').nth(1);
    await expect(desplegableModelo.locator('option', { hasText: /^Modelo E2E \(piezas\/h\)$/ })).toHaveCount(1);
    await expect(desplegablePuesto.locator('option', { hasText: /^Puesto E2E$/ })).toHaveCount(1);

    await desplegableModelo.selectOption({ label: `${MODELO} (piezas/h)` });
    await desplegablePuesto.selectOption({ label: PUESTO });
    await page.getByPlaceholder('Ej: 100').fill(CANTIDAD);

    await page.getByRole('button', { name: 'Crear', exact: true }).click();

    // El formulario se cierra solo cuando el alta ha ido bien.
    await expect(page.getByRole('heading', { name: 'Nueva Orden de Producción' })).toBeHidden();
    await expect(page.getByText(new RegExp(`${PUESTO} · Cant: ${CANTIDAD}`)).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('heading', { name: MODELO }).first()).toBeVisible();
  });
});
