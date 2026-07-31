import type { Page } from '@playwright/test';

/**
 * Mock backend API responses for E2E tests.
 *
 * Uses regex patterns to match specific API URL paths without
 * intercepting Vite source files at /src/api/*.
 */
export async function setupMocks(page: Page) {
  // Operator panel: available orders
  await page.route(/\/api\/orders\/available($|\?)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'ord-001', model_id: 'mod-1', workstation_id: 'ws-1', quantity: 500, status: 'pending', created_by: 'admin-dev-01', custom_fields: { numero_orden: 'ORD-2026-001', material: 'Aluminio 6063' }, model_name: 'Perfil 20x20', workstation_name: 'Línea A', created_at: '2026-07-23T10:00:00Z', updated_at: '2026-07-23T10:00:00Z' },
        { id: 'ord-002', model_id: 'mod-2', workstation_id: 'ws-2', quantity: 200, status: 'in_progress', created_by: 'admin-dev-01', custom_fields: { numero_orden: 'ORD-2026-002', material: 'Acero inox' }, model_name: 'Tubo 40x40', workstation_name: 'Línea B', created_at: '2026-07-23T08:00:00Z', updated_at: '2026-07-23T09:30:00Z' },
      ]),
    });
  });

  // Operator context
  await page.route(/\/production\/operator\/context($|\?)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ operatorId: 'op-001', operatorName: 'Carlos López', workstationId: 'ws-1', workstationName: 'Línea A' }),
    });
  });

  // Tenant capabilities (called as /tenant/capabilities or /api/tenant/capabilities)
  await page.route(/\/tenant\/capabilities($|\?)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tenantId: '1', governanceVersion: 1,
        modules: { core_mes: { enabled: true }, oee_monitoring: { enabled: true }, quality_assurance: { enabled: true }, cost_management: { enabled: true } },
        quotas: { max_users: 10, max_workstations: 5, max_custom_fields: 20 },
        customFieldsSchema: { production_orders: { fields: [{ key: 'numero_orden', label: 'Número de Orden', type: 'string', required: true }, { key: 'material', label: 'Material', type: 'string', required: false }] } },
      }),
    });
  });

  // Order detail
  await page.route(/\/production\/orders\/(?!available)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'ord-001', code: 'ORD-2026-001', status: 'in_progress', quantity: 500, produced_quantity: 120, defect_quantity: 3, model_name: 'Perfil 20x20', workstation_name: 'Línea A', custom_fields: { numero_orden: 'ORD-2026-001', material: 'Aluminio 6063' } }),
    });
  });

  // Admin: users
  await page.route(/\/api\/users($|\?)/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { id: 'user-1', username: 'admin', email: 'admin@kavana.com', role: 'tenant_admin', tenant_id: '1', is_active: true },
      { id: 'user-2', username: 'operario1', email: 'op1@kavana.com', role: 'operario', tenant_id: '1', is_active: true },
      { id: 'user-3', username: 'supervisor', email: 'sup@kavana.com', role: 'supervisor', tenant_id: '1', is_active: true },
    ])});
  });

  // Admin: workstations
  await page.route(/\/api\/workstations($|\?)/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { id: 'ws-1', name: 'Línea A', status: 'active', tenant_id: '1' },
      { id: 'ws-2', name: 'Línea B', status: 'active', tenant_id: '1' },
      { id: 'ws-3', name: 'Línea C', status: 'maintenance', tenant_id: '1' },
    ])});
  });

  // Admin: models
  await page.route(/\/api\/manufacturing-models($|\?)/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { id: 'mod-1', name: 'Perfil 20x20', unit_of_measure: 'm', tenant_id: '1' },
      { id: 'mod-2', name: 'Tubo 40x40', unit_of_measure: 'm', tenant_id: '1' },
    ])});
  });

  // Supervisor: orders list
  await page.route(/\/api\/orders($|\?)/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  // Entity CRUD fallbacks
  await page.route(/\/api\/toolings($|\?)/, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
  await page.route(/\/api\/incidencias($|\?)/, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
  await page.route(/\/api\/incidencias\/stats($|\?)/, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ open: 0, in_progress: 0, resolved: 0 }) }));
  await page.route(/\/api\/toolings\/types($|\?)/, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

  // Premium modules
  await page.route(/\/oee\//, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workstations: [], summary: { oee: 0, availability: 0, performance: 0, quality: 0 } }) }));
  await page.route(/\/quality\//, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
  await page.route(/\/cost\//, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
}

export async function setMockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kavana_dev_token', 'mock-token');
    localStorage.setItem('kavana_tenant_id', '1');
    localStorage.setItem('kavana_user_id', 'admin-dev-01');
    localStorage.setItem('kavana_role', 'tenant_admin');
    localStorage.setItem('kavana_tenant_name', 'Kavana Demo');
  });
}
