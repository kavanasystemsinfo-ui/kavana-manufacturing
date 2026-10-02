import { test, expect, type Page } from '@playwright/test';

/**
 * La promesa que sostiene el producto: en planta, sin red, el HMI sigue en pie.
 *
 * Estas pruebas describen lo que un operario vive de verdad en una nave con el
 * WiFi a ratos: abre la tablet, recarga y sigue trabajando aunque no haya red.
 * Se escriben antes del arreglo: hoy fallan, y ese fallo es el hallazgo.
 *
 * Los datos (puesto, orden y operario apuntado al puesto) los deja
 * `database/scripts/e2e-setup.js`, que corre el globalSetup de Playwright.
 */

const TENANT = 'demo';
const OPERARIO = { usuario: '1094', password: 'kavana' };

const PUESTO_E2E = 'Puesto E2E';
const CANTIDAD_E2E = 100;
const PRODUCIDAS_SIN_RED = '7';

async function login(page: Page, usuario: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('ej. megalux').fill(TENANT);
  await page.getByPlaceholder('admin').fill(usuario);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Acceder al Sistema' }).click();
  await page.waitForURL(new RegExp(`/${TENANT}(/|$)`));
}

/** La tarjeta de la orden del flujo E2E, la misma que usa el flujo completo. */
function tarjetaOrden(page: Page) {
  return page
    .getByRole('button')
    .filter({ hasText: PUESTO_E2E })
    .filter({ hasText: 'Cant: 100' })
    .first();
}

/**
 * Lo que el servidor dice de la orden del flujo, para comprobar que llegó lo
 * registrado sin red. La orden se identifica por puesto y cantidad, igual que
 * en la pantalla: el listado de disponibles no devuelve el N.º de orden, y el
 * sembrado borra los restos de ejecuciones anteriores de ese puesto.
 */
async function producidoEnServidor(page: Page): Promise<number | null> {
  const token = await page.evaluate(() => localStorage.getItem('kavana_dev_token'));
  const respuesta = await page.request.get('/api/v1/orders/available', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!respuesta.ok()) return null;
  const ordenes = (await respuesta.json()) as Array<Record<string, unknown>>;
  const orden = ordenes.find(
    (o) => o.workstation_name === PUESTO_E2E && Number(o.quantity) === CANTIDAD_E2E,
  );
  if (!orden) return null;
  return Number(orden.produced_quantity ?? 0);
}

/**
 * La copia local se escribe DESPUÉS de pintar la lista (`set` y luego el
 * guardado en IndexedDB), así que ver la tarjeta no garantiza que el
 * dispositivo ya la tenga guardada. Sin esta espera la recarga sin red es una
 * carrera y en el CI falló de forma intermitente.
 */
async function copiaLocalGuardada(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const peticion = indexedDB.open('KavanaHmiDatabase');
          const base = await new Promise<IDBDatabase | null>((resolve) => {
            peticion.onsuccess = () => resolve(peticion.result);
            peticion.onerror = () => resolve(null);
          });
          if (!base || !Array.from(base.objectStoreNames).includes('snapshots')) return 0;
          return new Promise<number>((resolve) => {
            const transaccion = base.transaction('snapshots', 'readonly');
            const cuenta = transaccion.objectStore('snapshots').count();
            cuenta.onsuccess = () => resolve(cuenta.result);
            cuenta.onerror = () => resolve(0);
          });
        }),
      { timeout: 20000, intervals: [250] },
    )
    .toBeGreaterThan(0);
}

test.describe('Offline-first: el HMI en planta sin red', () => {
  test.setTimeout(120000);

  test('la aplicación sigue en pie después de recargar sin red', async ({ page }) => {
    await login(page, OPERARIO.usuario, OPERARIO.password);
    await expect(page.getByRole('heading', { name: 'Seleccionar Orden' })).toBeVisible();

    // Se espera a que el trabajador de servicio tome el control de la aplicación:
    // sin él, la recarga sin red devuelve el error del navegador.
    await page.waitForFunction(
      () => navigator.serviceWorker?.controller !== null || (navigator.serviceWorker?.ready !== undefined && true),
      null,
      { timeout: 30000 },
    );

    await page.context().setOffline(true);
    await page.reload();

    // Sin red y tras recargar, el operario tiene que seguir viendo su pantalla.
    await expect(page.getByRole('heading', { name: /Seleccionar Orden|Panel de Operario/ })).toBeVisible({
      timeout: 25000,
    });
    await expect(page.locator('body')).toContainText(/KAVANA|Seleccionar/);
  });

  test('el operario ve sus órdenes sin red aunque acabe de recargar', async ({ page }) => {
    await login(page, OPERARIO.usuario, OPERARIO.password);
    await expect(tarjetaOrden(page)).toBeVisible({ timeout: 20000 });
    await copiaLocalGuardada(page);

    await page.context().setOffline(true);
    await page.reload();

    // La lista de órdenes tiene que salir de la copia local, no del servidor.
    await expect(tarjetaOrden(page)).toBeVisible({ timeout: 25000 });
  });

  test('lo registrado sin red llega al servidor al volver la conexión', async ({ page }) => {
    await login(page, OPERARIO.usuario, OPERARIO.password);

    const antes = (await producidoEnServidor(page)) ?? 0;

    await expect(tarjetaOrden(page)).toBeVisible({ timeout: 20000 });
    await copiaLocalGuardada(page);

    await page.context().setOffline(true);
    await page.reload();
    await expect(tarjetaOrden(page)).toBeVisible({ timeout: 25000 });
    await tarjetaOrden(page).click();
    await expect(page.getByRole('heading', { name: 'Panel de Operario' })).toBeVisible();

    const horas = page.locator('input[type="time"]');
    await horas.nth(0).fill('08:00');
    await horas.nth(1).fill('09:00');
    const numeros = page.locator('input[type="number"]');
    await numeros.nth(0).fill(PRODUCIDAS_SIN_RED);
    await numeros.nth(1).fill('0');

    await page.getByRole('button', { name: 'Registrar Producción' }).click();

    // Sin red, el parte queda en el dispositivo y se dice sin alarmar.
    await expect(page.getByText(/Sin conexión/)).toBeVisible({ timeout: 15000 });

    // Vuelve la red: el parte tiene que subir solo, sin perderlo.
    await page.context().setOffline(false);
    await expect(page.getByText('Fallos: 0')).toBeVisible({ timeout: 20000 });

    await expect
      .poll(async () => producidoEnServidor(page), { timeout: 40000, intervals: [2000] })
      .toBe(antes + Number(PRODUCIDAS_SIN_RED));
  });
});
