import { test, expect, type Page } from '@playwright/test';

/**
 * El tablero de incidencias: la vista de gestión donde se arrastra una incidencia
 * de una columna a otra y el cambio queda guardado.
 *
 * La incidencia de prueba la deja `database/scripts/e2e-setup.js` siempre en
 * «Abierto», así que el arrastre parte del mismo sitio en cada ejecución.
 */

const TENANT = 'demo';
const INCIDENCIA = 'Incidencia E2E';

async function login(page: Page, usuario: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('ej. megalux').fill(TENANT);
  await page.getByPlaceholder('admin').fill(usuario);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Acceder al Sistema' }).click();
  await page.waitForURL(new RegExp(`/${TENANT}(/|$)`));
}

/** Arrastra una tarjeta a una columna. dnd-kit necesita pasos, no un salto. */
async function arrastrarA(page: Page, texto: string, columna: string) {
  const tarjeta = page.getByText(texto).first();
  const destino = page.getByLabel(columna);
  await expect(tarjeta).toBeVisible();
  const desde = await tarjeta.boundingBox();
  const hasta = await destino.boundingBox();
  if (!desde || !hasta) throw new Error('No se han podido medir la tarjeta o la columna');

  await page.mouse.move(desde.x + desde.width / 2, desde.y + desde.height / 2);
  await page.mouse.down();
  // El sensor exige 8 px de movimiento para activarse: el primer paso lo supera.
  await page.mouse.move(desde.x + desde.width / 2, desde.y + desde.height / 2 + 20, { steps: 5 });
  await page.mouse.move(hasta.x + hasta.width / 2, hasta.y + 40, { steps: 12 });
  await page.mouse.up();
}

test.describe('Tablero de incidencias', () => {
  test.setTimeout(90000);

  test('una incidencia se mueve de columna arrastrando y el cambio se guarda', async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.getByRole('button', { name: 'Incidencias', exact: true }).click();

    // La vista de consulta sigue siendo la de siempre; el tablero es la de gestión.
    await page.getByRole('button', { name: 'Tablero' }).click();
    await expect(page.getByLabel('Abiertas')).toContainText(INCIDENCIA);

    await arrastrarA(page, INCIDENCIA, 'En progreso');

    // El cambio se comprueba en la lista, que es donde se lee el estado: si el
    // arrastre no hubiera guardado, el badge seguiría diciendo «abierto».
    await page.getByRole('button', { name: 'Lista' }).click();
    const fila = page.locator('div').filter({ hasText: INCIDENCIA }).filter({ hasText: 'en progreso' });
    await expect(fila.first()).toBeVisible({ timeout: 15000 });

    // Y sobrevive a una recarga: no era solo un cambio en pantalla.
    await page.reload();
    await page.getByRole('button', { name: 'Incidencias', exact: true }).click();
    await page.getByRole('button', { name: 'Tablero' }).click();
    await expect(page.getByLabel('En progreso')).toContainText(INCIDENCIA, { timeout: 15000 });
  });

  test('el supervisor ve el mismo tablero (es el mismo componente)', async ({ page }) => {
    // El componente vive en `components/incidencias/` y lo usan los dos paneles.
    // El tablero está en el panel moderno: el tema clásico del supervisor todavía
    // usa su vista con botones (ver la nota al final del spec).
    await login(page, '047', 'kavana');
    await page.getByRole('button', { name: 'Kavana', exact: true }).click();
    await page.getByRole('button', { name: /Incidencias/ }).first().click();

    await expect(page.getByLabel('Incidencias por estado')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(INCIDENCIA)).toBeVisible();
  });
});

