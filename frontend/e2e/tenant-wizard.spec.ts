import { test, expect } from '@playwright/test';

/**
 * E2E de la tarea 3.1: el wizard de alta de tenant del Global Admin.
 *
 * El panel /global-admin se autoriza por identidad de plataforma
 * (GLOBAL_ADMIN_USER_IDS, lista de uuid de usuarios): el seed del E2E crea el
 * usuario kavana_admin con un uuid fijo y el backend del E2E arranca con esa
 * lista. El flujo prueba el criterio de aceptación del plan: crear
 * tenant + módulos + admin guiado, sin conocer el esquema de createTenant.
 */

const WIZARD = {
  tenantId: 97,
  tenantName: 'Acme Wizard E2E',
  subdomain: 'acmee2e',
  adminUser: 'acmeadmin',
  adminPass: 'acme1234',
  platformUsername: 'kavana_admin',
  platformPassword: 'kavana',
};

async function loginGlobalAdmin(page: import('@playwright/test').Page) {
  // El usuario de plataforma vive en el tenant demo: se entra por el login de
  // subdomain y luego se navega a /global-admin con el token ya en el almacén.
  await page.goto('/');
  await page.getByPlaceholder('ej. megalux').fill('demo');
  await page.getByPlaceholder('admin').fill(WIZARD.platformUsername);
  await page.getByPlaceholder('••••••••').fill(WIZARD.platformPassword);
  await page.getByRole('button', { name: 'Acceder al Sistema' }).click();
  await page.waitForURL(/demo(\/|$)/);
}

test.describe('Wizard de alta de tenant (3.1)', () => {
  test.setTimeout(90000);

  test('los 3 pasos crean tenant + módulos + admin y el admin nuevo entra', async ({ page, request }) => {
    // El spec crea siempre el tenant 97. Si quedó de una pasada anterior del
    // mismo run (reintento) el alta devolvería 409, el wizard no cerraría y la
    // aserción estricta lo cantaría. Se limpia por API para que sea idempotente.
    const auth = await request.post('/api/v1/auth/login-by-tenant', {
      data: {
        subdomain: 'demo',
        username: WIZARD.platformUsername,
        password: WIZARD.platformPassword,
      },
    });
    const { token } = await auth.json();
    await request.delete(`/api/v1/global-admin/tenants/${WIZARD.tenantId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await loginGlobalAdmin(page);
    await page.goto('/global-admin');

    // El stepper del wizard sustituye al formulario todo-en-uno.
    await page.getByRole('button', { name: '+ Nuevo' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo cliente' })).toBeVisible();

    // Paso 1: datos del tenant. Siguiente deshabilitado hasta rellenar.
    const next = page.getByRole('button', { name: 'Siguiente' });
    await expect(next).toBeDisabled();
    await page.locator('#tw-id').fill(String(WIZARD.tenantId));
    await page.locator('#tw-name').fill(WIZARD.tenantName);
    await page.locator('#tw-subdomain').fill('Acme E2E!');
    // El subdomain se normaliza al teclear: minúsculas y sin espacios/signos.
    await expect(page.locator('#tw-subdomain')).toHaveValue(WIZARD.subdomain);
    await next.click();

    // Paso 2: módulos. Core MES nace marcado y no se puede desmarcar.
    await expect(page.getByText('Paso 2 de 3 — Módulos')).toBeVisible();
    const oee = page.getByRole('button', { name: /^OEE/ });
    await oee.click();
    await next.click();

    // Paso 3: credenciales del admin del tenant nuevo.
    await expect(page.getByText('Paso 3 de 3 — Administrador')).toBeVisible();
    const crear = page.getByRole('button', { name: 'Crear cliente' });
    await expect(crear).toBeDisabled();
    await page.locator('#tw-user').fill(WIZARD.adminUser);
    await page.locator('#tw-pass').fill(WIZARD.adminPass);
    await crear.click();

    // Al terminar vuelve a la pestaña de clientes y el tenant nuevo aparece EN LA
    // TABLA. El wizard también pinta el nombre del tenant («Se creará el cliente
    // Acme Wizard E2E…»), así que buscar el texto suelto pasaba aunque el alta
    // hubiera fallado: el 29/09 el alta devolvió 409 y el spec lo dio por bueno,
    // dejando el 401 del login sin explicación. De ahí las dos aserciones:
    // el wizard cerrado y el nombre como CELDA de la tabla de clientes.
    await expect(page.getByRole('heading', { name: 'Nuevo cliente' })).toHaveCount(0);
    await expect(page.getByRole('cell', { name: WIZARD.tenantName, exact: true })).toBeVisible({
      timeout: 20000,
    });

    // El admin creado por el wizard entra de verdad con sus credenciales,
    // por el subdominio del tenant que acaba de nacer.
    const login = await request.post('/api/v1/auth/login-by-tenant', {
      data: {
        subdomain: WIZARD.subdomain,
        username: WIZARD.adminUser,
        password: WIZARD.adminPass,
      },
    });
    expect(login.status()).toBe(201);
    const body = await login.json();
    expect(body.role).toBe('tenant_admin');
    expect(body.tenantId).toBe(String(WIZARD.tenantId));
  });
});
