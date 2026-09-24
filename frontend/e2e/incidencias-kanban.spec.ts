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
  // Los dos tests comparten la misma incidencia del seed y el primero la arrastra:
  // en paralelo el segundo la encuentra ya movida y falla por datos, no por código.
  test.describe.configure({ mode: 'serial' });
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

  test('el supervisor arrastra también en el tema clásico (el que va por defecto)', async ({ page }) => {
    // Decision de Jorge (2026-09-24): el tablero vive en los dos temas. El clásico
    // es el que ve el supervisor de planta sin tocar nada, asi que este test se
    // queda en el, sin cambiar de tema.
    await login(page, '047', 'kavana');
    await page.getByRole('button', { name: /Incidencias/ }).first().click();

    await expect(page.getByLabel('Incidencias por estado')).toBeVisible({ timeout: 15000 });
    // El test del admin (que corre primero en serie) la dejó en «En progreso»:
    // se arrastra DESDE donde esté hasta Resueltas, que es lo que este test prueba.
    const origen = (await page.getByLabel('En progreso').textContent())?.includes(INCIDENCIA)
      ? 'En progreso'
      : 'Abiertas';
    await expect(page.getByLabel(origen)).toContainText(INCIDENCIA);

    await arrastrarA(page, INCIDENCIA, 'Resueltas');

    await expect(page.getByLabel('Resueltas')).toContainText(INCIDENCIA, { timeout: 15000 });
  });
});

