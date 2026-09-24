// Prepara una base de datos para el E2E de flujo completo.
//
// Aplica la cadena de migraciones (si la base está vacía), los grants, el seed
// de desarrollo y los datos que necesitan los flujos: un puesto, una orden
// asignada a ese puesto y el operario apuntado a él. Es idempotente: se puede
// lanzar antes de cada ejecución y deja la orden a cero.
//
// Uso:
//   DATABASE_URL=postgresql://... node database/scripts/e2e-setup.js
//
// Lo llama también el globalSetup de Playwright, así que `npx playwright test`
// se basta solo con tener DATABASE_URL en el entorno.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const migrationsDir = resolve(projectRoot, 'database', 'migrations');
const seedFile = resolve(projectRoot, 'database', 'seed.sql');

// Constantes compartidas con el spec: si cambia un nombre aquí, cambia allí.
export const E2E = {
  tenantSubdomain: 'demo',
  operatorUsername: '1094',
  operatorWithoutWorkstation: '1095',
  operatorPassword: 'kavana',
  supervisorUsername: '047',
  supervisorPassword: 'kavana',
  workstationCode: 'E2E-WS',
  workstationName: 'Puesto E2E',
  modelName: 'Modelo E2E',
  incidenciaTitulo: 'Incidencia E2E',
  orderCode: 'E2E-ORD-1',
  orderQuantity: 100,
  // Usuario de plataforma para el panel /global-admin: su uuid es FIJO para
  // que el backend lo reconozca vía GLOBAL_ADMIN_USER_IDS (configurada por el
  // playwright.config.ts con este mismo valor). No existe en producción.
  platformAdminUsername: 'kavana_admin',
  platformAdminPassword: 'kavana',
  platformAdminUuid: '00000000-0000-4000-8000-0000000000aa',
};

/** Mismo formato que el backend (`scrypt:salt:hash`), para poder entrar con
 * usuario y contraseña desde el E2E. */
function scryptHash(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return rows.length > 0;
}

async function applyMigrations(client) {
  const { rows } = await client.query(`SELECT to_regclass('public.orders') AS t`);
  if (rows[0].t) {
    console.log('[e2e-setup] el esquema ya existe: no se reaplican las migraciones');
    return;
  }
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
    await client.query(sql);
    console.log(`[e2e-setup] migración aplicada: ${file}`);
  }
}

async function applyGrants(client) {
  const { rows } = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = 'kavana_app'`);
  if (rows.length === 0) return;
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kavana_app;
     GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO kavana_app;`,
  );
}

async function applySeed(client) {
  await client.query(readFileSync(seedFile, 'utf8'));
}

async function seedE2eData(client) {
  await client.query(
    `INSERT INTO workstations (tenant_id, code, name, status)
     SELECT 1, $1::text, $2::text, 'active'
      WHERE NOT EXISTS (
        SELECT 1 FROM workstations WHERE tenant_id = 1 AND upper(code) = upper($1::text)
      )`,
    [E2E.workstationCode, E2E.workstationName],
  );

  const { rows: wsRows } = await client.query(
    `SELECT id FROM workstations WHERE tenant_id = 1 AND upper(code) = upper($1::text)`,
    [E2E.workstationCode],
  );
  const workstationId = wsRows[0].id;

  // El desplegable de Modelo del formulario de nueva orden se alimenta de este
  // catálogo: sin al menos un modelo, el supervisor no puede crear nada.
  await client.query(
    `INSERT INTO manufacturing_models (tenant_id, name, unit_of_measure)
     SELECT 1, $1::text, 'piezas/h'
      WHERE NOT EXISTS (
        SELECT 1 FROM manufacturing_models WHERE tenant_id = 1 AND name = $1::text
      )`,
    [E2E.modelName],
  );

  const { rows: supRows } = await client.query(
    `SELECT id FROM users WHERE tenant_id = 1 AND lower(username) = lower($1::text)`,
    [E2E.supervisorUsername],
  );
  const createdBy = supRows[0].id;

  await client.query(
    `INSERT INTO orders (tenant_id, code, quantity, workstation_id, status, created_by, produced_quantity, defect_quantity, custom_fields)
     SELECT 1, $1::text, $2::int, $3::uuid, 'pending', $4::text, 0, 0, '{}'::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM orders WHERE tenant_id = 1 AND upper(code) = upper($1::text)
      )`,
    [E2E.orderCode, E2E.orderQuantity, workstationId, createdBy],
  );

  const { rows: orderRows } = await client.query(
    `SELECT id FROM orders WHERE tenant_id = 1 AND upper(code) = upper($1::text)`,
    [E2E.orderCode],
  );
  const orderId = orderRows[0].id;

  // La orden arranca de cero en cada ejecución: los partes de la corrida
  // anterior harían pasar la aserción del supervisor sin trabajar nada.
  await client.query(`DELETE FROM production_work_blocks WHERE tenant_id = 1 AND order_id = $1`, [orderId]);

  // Y se borran las órdenes que hayan dejado las corridas anteriores del E2E en
  // este puesto (el formulario del supervisor crea una orden nueva cada vez, con
  // sus defectos y su progreso). Sin esto, la lista acumula filas idénticas y las
  // aserciones del panel dejan de ser únicas. Se acota al puesto del E2E: la base
  // es de pruebas, pero no se toca nada que no haya creado este script.
  await client.query(
    `DELETE FROM orders
      WHERE tenant_id = 1 AND workstation_id = $1 AND COALESCE(upper(code), '') <> upper($2::text)`,
    [workstationId, E2E.orderCode],
  );

  await client.query(
    `UPDATE orders SET produced_quantity = 0, defect_quantity = 0, status = 'pending', updated_at = now()
      WHERE tenant_id = 1 AND id = $1`,
    [orderId],
  );

  // El panel de operario saca las órdenes disponibles del puesto por defecto del
  // usuario, así que sin esta asignación la lista sale vacía.
  await client.query(
    `UPDATE users SET default_workstation_id = $2
      WHERE tenant_id = 1 AND lower(username) = lower($1)`,
    [E2E.operatorUsername, workstationId],
  );

  // Los partes del operario de pruebas también se limpian: el E2E declara siempre
  // el mismo tramo horario, y un bloque que sobreviva de una corrida anterior
  // (por ejemplo, uno que acabó en otra orden) hace que el nuevo se rechace por
  // solape y el test falle por un motivo que no tiene nada que ver con el código.
  const { rows: opRows } = await client.query(
    `SELECT id FROM users WHERE tenant_id = 1 AND lower(username) = lower($1::text)`,
    [E2E.operatorUsername],
  );
  if (opRows.length > 0) {
    await client.query(`DELETE FROM production_work_blocks WHERE tenant_id = 1 AND operator_id = $1`, [
      opRows[0].id,
    ]);
  }

  // Operario SIN puesto: su panel tiene que decirle que pida un puesto, no un
  // «no hay órdenes» que él no puede resolver. Se crea aquí, no en el seed de
  // desarrollo, porque solo existe para este E2E.
  const { rows: noWsRows } = await client.query(
    `SELECT id FROM users WHERE tenant_id = 1 AND lower(username) = lower($1::text)`,
    [E2E.operatorWithoutWorkstation],
  );
  if (noWsRows.length === 0) {
    await client.query(
      `INSERT INTO users (tenant_id, username, password_hash, role, first_name, default_workstation_id)
       VALUES (1, $1::text, $2::text, 'operario', 'Sin puesto', NULL)`,
      [E2E.operatorWithoutWorkstation, scryptHash(E2E.operatorPassword)],
    );
  } else {
    await client.query(`UPDATE users SET default_workstation_id = NULL WHERE tenant_id = 1 AND id = $1`, [
      noWsRows[0].id,
    ]);
  }

  // Usuario de plataforma para el E2E del Global Admin (wizard de alta de
  // tenant): uuid fijo, reconocido por GLOBAL_ADMIN_USER_IDS del backend del
  // E2E. Se asegura también su rol de tenant_admin (la llave del guard) y su
  // contraseña, porque una corrida con el seed antiguo lo dejaría con otro
  // hash. La PK de users es compuesta (tenant_id, id), así que el ON CONFLICT
  // la declara entera. Idempotente.
  await client.query(
    `INSERT INTO users (id, tenant_id, username, password_hash, role, first_name)
     VALUES ($1::uuid, 1, $2::text, $3::text, 'tenant_admin', 'Plataforma')
      ON CONFLICT (tenant_id, id) DO UPDATE SET role = 'tenant_admin', password_hash = EXCLUDED.password_hash`,
    [E2E.platformAdminUuid, E2E.platformAdminUsername, scryptHash(E2E.platformAdminPassword)],
  );

  // El E2E del wizard crea su propio tenant (id 97) en cada corrida: se borra
  // para que el alta no choque con el de la corrida anterior. El borrado es
  // CASCADE sobre sus usuarios, igual que hace el DELETE del panel.
  await client.query(`DELETE FROM tenants WHERE id = $1::int`, [97]);

  // Una incidencia para el tablero: se borra y se recrea en cada corrida para que
  // el arrastre empiece siempre desde «Abierto».
  await client.query(`DELETE FROM incidencias WHERE tenant_id = 1 AND title = $1::text`, [
    E2E.incidenciaTitulo,
  ]);
  await client.query(
    `INSERT INTO incidencias (tenant_id, reported_by, type, title, description, status)
     VALUES (1, $1::uuid, 'calidad', $2::text, 'Creada por el seed del E2E', 'abierto')`,
    [createdBy, E2E.incidenciaTitulo],
  );

  return { workstationId, orderId };
}

export async function setupE2eDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('Falta DATABASE_URL: el E2E necesita una base de datos propia, no la de producción.');
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await applyMigrations(client);
    await applyGrants(client);
    await applySeed(client);
    const ids = await seedE2eData(client);
    const { rows } = await client.query(
      `SELECT o.code, o.quantity, o.produced_quantity, o.status, w.code AS workstation
         FROM orders o JOIN workstations w ON w.tenant_id = o.tenant_id AND w.id = o.workstation_id
        WHERE o.tenant_id = 1 AND upper(o.code) = upper($1)`,
      [E2E.orderCode],
    );
    console.log('[e2e-setup] listo:', JSON.stringify({ ...ids, order: rows[0] }));
    return ids;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  setupE2eDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[e2e-setup] error:', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
