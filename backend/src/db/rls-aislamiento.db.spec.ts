/**
 * Aislamiento entre plantas tal y como lo ve la base de datos.
 *
 * Por qué existe: la aplicación se conectaba con un rol que tiene BYPASSRLS, así que
 * las políticas del esquema no filtraban nada y el aislamiento dependía solo de que
 * cada consulta del código llevase su filtro por planta. Estas pruebas fijan el
 * comportamiento que debe cumplirse cuando la aplicación use el rol `kavana_app`:
 * sin contexto no se ve nada, con contexto solo lo propio, y no se puede escribir en
 * otra planta.
 *
 * Se prueba con `SET ROLE kavana_app` desde una conexión propia (no la del pool, que
 * arrastraría el rol a otras pruebas), así que no hace falta una credencial extra.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? '';
const HAY_BASE = DATABASE_URL.length > 0;

// Plantas de prueba: la 1 existe siempre (datos del demo); la 900004 la crea la
// propia prueba para tener una segunda planta con la que medir la fuga.
const PLANTA_PROPIA = 1;
const PLANTA_AJENA = 900004;
const SUBDOMINIO = 'rlsprueba';
const USUARIO = 'usuario-rls-prueba';

let owner: Client;
let app: Client;

async function comoApp<T>(fn: (client: Client) => Promise<T>, planta?: number): Promise<T> {
  await app.query('BEGIN');
  try {
    if (planta !== undefined) {
      await app.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(planta)]);
    }
    return await fn(app);
  } finally {
    // ROLLBACK deja la conexión limpia y sin el rol ni la planta puestos.
    await app.query('ROLLBACK');
  }
}

async function cuenta(client: Client, tabla: string, where = ''): Promise<number> {
  const { rows } = await client.query(`SELECT count(*)::int AS c FROM ${tabla} ${where}`);
  return rows[0].c;
}

describe.skipIf(!HAY_BASE)('Aislamiento entre plantas con el rol de la aplicación', () => {
  beforeAll(async () => {
    owner = new Client({ connectionString: DATABASE_URL });
    app = new Client({ connectionString: DATABASE_URL });
    await owner.connect();
    await app.connect();
    await app.query('SET ROLE kavana_app');

    await owner.query(`DELETE FROM tenants WHERE id = $1`, [PLANTA_AJENA]);
    // Restos de una pasada anterior: se limpian para poder repetir la prueba.
    await owner.query(`DELETE FROM orders WHERE code LIKE 'RLS-%'`);
    await owner.query(`DELETE FROM workstations WHERE code = 'RLS-WS'`);
    await owner.query(`DELETE FROM users WHERE username = $1`, [USUARIO]);
    await owner.query(
      `INSERT INTO tenants (id, name, status, subdomain) VALUES ($1, 'Planta RLS de prueba', 'active', $2)`,
      [PLANTA_AJENA, SUBDOMINIO],
    );
    await owner.query(
      `INSERT INTO users (tenant_id, id, username, password_hash, role)
       VALUES ($1, gen_random_uuid(), $2, 'scrypt:salt:hash', 'operario')`,
      [PLANTA_AJENA, USUARIO],
    );
    // El pedido exige puesto: se crea uno por planta y se guarda para los pedidos.
    const puestos: Record<number, string> = {};
    for (const planta of [PLANTA_AJENA, PLANTA_PROPIA]) {
      const { rows } = await owner.query(
        `INSERT INTO workstations (tenant_id, id, code, name)
         VALUES ($1, gen_random_uuid(), 'RLS-WS', 'Puesto RLS') RETURNING id`,
        [planta],
      );
      puestos[planta] = rows[0].id;
    }
    await owner.query(
      `INSERT INTO orders (tenant_id, code, quantity, status, workstation_id, created_by)
       VALUES ($1, 'RLS-AJENA-1', 10, 'pending', $2, 'rls-prueba')`,
      [PLANTA_AJENA, puestos[PLANTA_AJENA]],
    );
    await owner.query(
      `INSERT INTO orders (tenant_id, code, quantity, status, workstation_id, created_by)
       VALUES ($1, 'RLS-PROPIA-1', 10, 'pending', $2, 'rls-prueba')`,
      [PLANTA_PROPIA, puestos[PLANTA_PROPIA]],
    );
  });

  afterAll(async () => {
    if (!owner) return;
    await owner.query(`DELETE FROM orders WHERE code LIKE 'RLS-%'`);
    await owner.query(`DELETE FROM workstations WHERE code = 'RLS-WS'`);
    await owner.query(`DELETE FROM users WHERE username = $1`, [USUARIO]);
    await owner.query(`DELETE FROM tenants WHERE id = $1`, [PLANTA_AJENA]);
    await owner.end();
    await app.end();
  });

  it('sin contexto de planta no ve ninguna fila de las tablas con datos de cliente', async () => {
    const [pedidos, usuarios, plantas] = await comoApp((c) =>
      Promise.all([cuenta(c, 'orders'), cuenta(c, 'users'), cuenta(c, 'tenants')]),
    );
    expect({ pedidos, usuarios, plantas }).toEqual({ pedidos: 0, usuarios: 0, plantas: 0 });
  });

  it('con contexto ve lo suyo y nada de la otra planta', async () => {
    const propias = await comoApp(
      (c) => cuenta(c, 'orders', `WHERE code = 'RLS-PROPIA-1'`),
      PLANTA_PROPIA,
    );
    const ajenas = await comoApp(
      (c) => cuenta(c, 'orders', `WHERE code = 'RLS-AJENA-1'`),
      PLANTA_PROPIA,
    );
    expect(propias).toBe(1);
    expect(ajenas).toBe(0);
  });

  it('no puede escribir un pedido en otra planta', async () => {
    const error = await comoApp(async (c) => {
      try {
        await c.query(
          `INSERT INTO orders (tenant_id, code, quantity, status) VALUES ($1, 'RLS-FUGA', 1, 'pending')`,
          [PLANTA_AJENA],
        );
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    }, PLANTA_PROPIA);
    expect(error).toMatch(/row-level security/i);
  });

  it('no puede tocar un pedido de otra planta', async () => {
    const tocadas = await comoApp(
      (c) => c.query(`UPDATE orders SET quantity = 999 WHERE code = 'RLS-AJENA-1'`).then((r) => r.rowCount),
      PLANTA_PROPIA,
    );
    expect(tocadas).toBe(0);
  });

  it('el login puede resolver usuario y planta sin contexto, y nada más', async () => {
    const encontrado = await comoApp((c) =>
      c.query(`SELECT * FROM auth_login_lookup($1, $2)`, [USUARIO, SUBDOMINIO]),
    );
    expect(encontrado.rows).toHaveLength(1);
    expect(encontrado.rows[0].tenant_id).toBe(String(PLANTA_AJENA));
    expect(encontrado.rows[0].tenant_name).toBe('Planta RLS de prueba');

    // La misma llamada con otro subdominio no devuelve nada: no vale como puerta
    // abierta a todos los usuarios.
    const conOtroSubdominio = await comoApp((c) =>
      c.query(`SELECT * FROM auth_login_lookup($1, $2)`, [USUARIO, 'otra-planta']),
    );
    expect(conOtroSubdominio.rows).toHaveLength(0);
  });

  it('la tabla de usuarios solo muestra los de la planta del contexto', async () => {
    // Con el contexto de su propia planta, el usuario se ve (el login lo necesita);
    // desde otra planta, ni se ve ni se cuenta.
    const enSuPlanta = await comoApp(
      (c) => cuenta(c, 'users', `WHERE username = '${USUARIO}'`),
      PLANTA_AJENA,
    );
    const desdeOtraPlanta = await comoApp(
      (c) => cuenta(c, 'users', `WHERE username = '${USUARIO}'`),
      PLANTA_PROPIA,
    );
    expect(enSuPlanta).toBe(1);
    expect(desdeOtraPlanta).toBe(0);
  });

  it('con el contexto de una planta no puede leer el catalogo de plantas', async () => {
    const plantas = await comoApp((c) => cuenta(c, 'tenants'), PLANTA_PROPIA);
    expect(plantas).toBe(1);
  });
});
