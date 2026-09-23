import { test, expect, type Page } from '@playwright/test';

/**
 * Flujo vertical completo, el que un cliente hace de verdad:
 * el operario entra, registra lo que ha producido, y el supervisor lo ve.
 *
 * Los datos que necesita (puesto, orden y operario apuntado al puesto) los deja
 * `database/scripts/e2e-setup.js`, que corre el globalSetup de Playwright.
 */

const TENANT = 'demo';
const OPERARIO = { usuario: '1094', password: 'kavana' };
const SUPERVISOR = { usuario: '047', password: 'kavana' };

const PUESTO_E2E = 'Puesto E2E';
const PRODUCIDAS = '60';
const DEFECTOS = '2';

async function login(page: Page, usuario: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('ej. megalux').fill(TENANT);
  await page.getByPlaceholder('admin').fill(usuario);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Acceder al Sistema' }).click();
  await page.waitForURL(new RegExp(`/${TENANT}(/|$)`));
}

async function logout(page: Page) {
  await page.getByRole('button', { name: /^Salir/ }).click();
  // El cierre de sesión no navega: deja la misma URL y pinta el login del
  // tenant. Por eso se espera al formulario, no a un cambio de dirección.
  await expect(page.getByText('Inicia sesión para continuar')).toBeVisible();
}

test.describe('Flujo completo: operario produce y supervisor lo ve', () => {
  // El flujo encadena dos sesiones y esperas de sincronización: 30 s de
  // presupuesto por defecto se quedan cortos.
  test.setTimeout(90000);

  test('el parte del operario aparece en el panel del supervisor', async ({ page }) => {
    // --- 1. El operario entra con sus credenciales reales ---
    await login(page, OPERARIO.usuario, OPERARIO.password);
    await expect(page.getByRole('heading', { name: 'Seleccionar Orden' })).toBeVisible();

    // --- 2. Elige la orden de su puesto ---
    // Se ancla en la cantidad y no solo en el puesto: el otro spec del E2E crea
    // órdenes nuevas en este mismo puesto y el operario cogería la primera de la
    // lista, que no es la suya.
    const orden = page
      .getByRole('button')
      .filter({ hasText: PUESTO_E2E })
      .filter({ hasText: 'Cant: 100' })
      .first();
    await expect(orden).toBeVisible();
    await orden.click();
    await expect(page.getByRole('heading', { name: 'Panel de Operario' })).toBeVisible();

    // --- 3. Declara un bloque de producción ---
    const horas = page.locator('input[type="time"]');
    await horas.nth(0).fill('08:00');
    await horas.nth(1).fill('10:00');

    const numeros = page.locator('input[type="number"]');
    await numeros.nth(0).fill(PRODUCIDAS);
    await numeros.nth(1).fill(DEFECTOS);

    await page.getByRole('button', { name: 'Registrar Producción' }).click();

    // El bloque entra en la cola local y el motor de sincronización lo manda al
    // backend. Si el envío se rechaza, el bloque cae a la bandeja de fallos: por
    // eso se comprueba que la bandeja sigue vacía después de darle tiempo al
    // sync, no solo que la cola esté a cero.
    await expect(page.getByText('Fallos: 0')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(4000);
    await expect(page.getByText('Fallos: 0')).toBeVisible();

    // --- 4. El supervisor entra y ve el parte ---
    await logout(page);
    await login(page, SUPERVISOR.usuario, SUPERVISOR.password);
    await expect(page.getByRole('heading', { name: 'Panel de Supervisión' })).toBeVisible();

    // En una base de pruebas puede haber más de una orden en el mismo puesto:
    // lo que identifica a la de este flujo es su progreso y sus defectos.
    await expect(page.getByText(new RegExp(`${PRODUCIDAS} / 100 \\(60%\\)`))).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(new RegExp(`Defectos: ${DEFECTOS}`))).toBeVisible();
    await expect(page.getByText(/Puesto: Puesto E2E/).first()).toBeVisible();
    await expect(page.getByText('En Progreso').first()).toBeVisible();
  });
});
