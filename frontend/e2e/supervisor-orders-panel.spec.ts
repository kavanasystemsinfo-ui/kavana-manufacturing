import { test, expect, type Page } from '@playwright/test';

/**
 * El panel de órdenes del supervisor: filtros, búsqueda y el arrastre del tablero.
 *
 * Antes de este cambio el panel descargaba e intentaba pintar las 1.215 órdenes de
 * la fábrica (180.000 px de scroll, 1.214 botones «Eliminar» vivos) y no había
 * forma de encontrar una orden concreta. Lo que se comprueba aquí es que el
 * filtro va al SERVIDOR (con una búsqueda que no existe, la tabla queda vacía),
 * que el estado se puede acotar, y que arrastrar una tarjeta lanza de verdad el
 * cambio de estado con su feedback, sin error rojo.
 */

const TENANT = 'demo';
const SUPERVISOR = { usuario: '047', password: 'kavana' };
/** Orden que deja el e2e-setup: única y con estado conocido. */
const ORDEN_SEED = 'E2E-ORD-1';

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

test.describe('Panel de órdenes del supervisor', () => {
  test.setTimeout(90000);

  test('la lista arranca en las órdenes vivas y la búsqueda la manda al servidor', async ({ page }) => {
    await login(page, SUPERVISOR.usuario, SUPERVISOR.password);
    await expect(page.getByRole('heading', { name: 'Panel de Supervisión' })).toBeVisible();

    // Vista de lista: la orden del seed está activa, así que aparece sola.
    await page.getByRole('button', { name: 'Lista' }).click();
    await expect(page.getByRole('row').filter({ hasText: ORDEN_SEED })).toBeVisible({ timeout: 15000 });

    // El histórico no se descarga por defecto: la lista no puede tener cientos
    // de filas pintadas de golpe.
    const filas = await page.getByRole('row').count();
    expect(filas).toBeLessThan(70);

    // Una búsqueda que no existe deja la tabla vacía: la filtra el backend, no
    // el navegador (con el filtro en memoria, esa orden seguiría en el DOM).
    await page.getByLabel('Buscar').fill('NO-EXISTE-ESTA-ORDEN');
    await expect(page.getByText('No hay órdenes con estos filtros')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('row').filter({ hasText: ORDEN_SEED })).toHaveCount(0);

    // Y al limpiar vuelve.
    await page.getByLabel('Buscar').fill('');
    await expect(page.getByRole('row').filter({ hasText: ORDEN_SEED })).toBeVisible({ timeout: 15000 });

    // El filtro de estado también acota: la orden del seed está en progreso, así
    // que no aparece al mirar solo las completadas.
    await page.getByLabel('Estado').selectOption('completed');
    await expect(page.getByRole('row').filter({ hasText: ORDEN_SEED })).toHaveCount(0);
    await page.getByLabel('Estado').selectOption('activas');
    await expect(page.getByRole('row').filter({ hasText: ORDEN_SEED })).toBeVisible({ timeout: 15000 });
  });

  test('arrastrar una tarjeta cambia el estado de verdad (persiste) y sin error rojo', async ({ page }) => {
    await login(page, SUPERVISOR.usuario, SUPERVISOR.password);
    await page.getByRole('button', { name: 'Tablero' }).click();

    // La orden del seed puede estar pendiente o en progreso según qué specs hayan
    // corrido antes (el flujo completo la pasa a en progreso). Se mira en qué
    // columna está y se arrastra a la otra: la prueba no depende del orden de la suite.
    const enPendiente = (await page.getByLabel('Pendiente').getByText(ORDEN_SEED).count()) > 0;
    const origen = enPendiente ? 'Pendiente' : 'En Progreso';
    const destino = enPendiente ? 'En Progreso' : 'Pendiente';
    const estadoEsperado = enPendiente ? 'in_progress' : 'pending';
    await expect(page.getByLabel(origen).getByText(ORDEN_SEED)).toBeVisible({ timeout: 15000 });

    // El gesto: la petición que sale del arrastre tiene que llevar el estado de
    // destino. Es lo que distingue «se movió en pantalla» de «se pidió el cambio».
    const peticion = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().includes('/api/v1/orders/'),
    );
    await arrastrarA(page, ORDEN_SEED, destino);
    const enviada = await peticion;
    expect(enviada.postDataJSON()).toEqual({ status: estadoEsperado });
    // El movimiento se acepta (200): en la demo el estado SÍ se guarda.
    expect((await enviada.response())?.status()).toBe(200);

    // Y persiste: al recargar, la tarjeta sigue en la columna de destino.
    await page.reload();
    await page.getByRole('button', { name: 'Tablero' }).click();
    await expect(page.getByLabel(destino).getByText(ORDEN_SEED)).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
  });

  test('borrar en la demo se explica en neutro y no borra la orden', async ({ page }) => {
    await login(page, SUPERVISOR.usuario, SUPERVISOR.password);
    await page.getByRole('button', { name: 'Tablero' }).click();

    const tarjeta = page.locator('[role="listitem"]').filter({ hasText: ORDEN_SEED });
    await expect(tarjeta).toBeVisible({ timeout: 15000 });

    // El botón destructivo confirma en el propio botón: dos clics, sin diálogo.
    await tarjeta.getByRole('button', { name: `Eliminar la orden ${ORDEN_SEED}` }).click();
    await tarjeta.getByRole('button', { name: '¿Seguro?' }).click();

    // Lo que el blindaje sigue rechazando (borrar) se cuenta en neutro, no en rojo.
    await expect(page.getByText(/En la demo no se borra/)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    await expect(tarjeta).toBeVisible();
  });
});
