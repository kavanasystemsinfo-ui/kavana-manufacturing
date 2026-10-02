/**
 * El fallo del OEE sobre datos de verdad, con el caso que lo destapa.
 *
 * El objetivo de producción se buscaba comparando el CÓDIGO de la orden con el
 * NOMBRE del modelo. En los datos de la demo ambos coinciden, así que el fallo
 * no se veía en pantalla; en una planta real el código es «OP-2026-0007» y el
 * modelo «Placa solar 450 W». Esta prueba siembra ese caso y exige que el
 * rendimiento salga del objetivo correcto.
 *
 * Requiere DATABASE_URL de una base de PRUEBAS con la cadena de migraciones
 * aplicada (database/scripts/e2e-setup.js). Sin esa variable se salta entera.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantContextStorage } from '../auth/tenant-context.storage.js';
import { OeeService } from './oee.service.js';

const HAS_DATABASE = Boolean(process.env.DATABASE_URL);

const TENANT = 900005n;
const SUBDOMINIO = 'objetivoprueba';
const CODIGO_ORDEN = 'OP-2026-0007';
const NOMBRE_MODELO = 'Placa solar 450 W';
const OBJETIVO_POR_HORA = 250;

const INICIO_PERIODO = '2026-07-04T00:00:00.000Z';
const FIN_PERIODO = '2026-07-04T23:59:59.000Z';

let workstationId = '';

async function rows<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const resultado = await postgresPool.query(sql, params);
  return resultado.rows as T[];
}

/**
 * Las claves foráneas de esta base no borran en cascada desde `tenants`, así que
 * la limpieza va de hijos a padre, en orden.
 */
async function limpiarPlanta(): Promise<void> {
  for (const tabla of [
    'production_work_blocks',
    'orders',
    'workstations',
    'manufacturing_models',
    'users',
  ]) {
    await rows(`DELETE FROM ${tabla} WHERE tenant_id = $1::bigint`, [String(TENANT)]);
  }
  await rows(`DELETE FROM tenants WHERE id = $1::bigint`, [String(TENANT)]);
}

describe.skipIf(!HAS_DATABASE)('OEE: el objetivo sale del modelo de la orden', () => {
  beforeAll(async () => {
    if (!HAS_DATABASE) return;

    // El borrado va de hijos a padre: las claves foráneas de esta base no
    // borran en cascada desde `tenants`.
    await limpiarPlanta();
    await rows(
      `INSERT INTO tenants (id, name, subdomain, status, custom_fields_schema, feature_matrix)
       VALUES ($1::bigint, 'Planta objetivo', $2, 'active', '{}'::jsonb, '{}'::jsonb)`,
      [String(TENANT), SUBDOMINIO],
    );

    const operario = await rows<{ id: string }>(
      `INSERT INTO users (tenant_id, username, password_hash, role, is_active)
       VALUES ($1::bigint, 'spec-oee-operario', 'spec:hash', 'operario', true)
       RETURNING id`,
      [String(TENANT)],
    );

    const modelo = await rows<{ id: string }>(
      `INSERT INTO manufacturing_models (tenant_id, name, target_rate)
       VALUES ($1::bigint, $2, $3) RETURNING id`,
      [String(TENANT), NOMBRE_MODELO, OBJETIVO_POR_HORA],
    );

    const puesto = await rows<{ id: string }>(
      `INSERT INTO workstations (tenant_id, code, name)
       VALUES ($1::bigint, 'OBJ-WS', 'Enmarcadora objetivo') RETURNING id`,
      [String(TENANT)],
    );
    workstationId = puesto[0].id;

    // El código de la orden no tiene nada que ver con el nombre del modelo:
    // es justo el caso que dejaba el rendimiento a cero.
    const orden = await rows<{ id: string }>(
      `INSERT INTO orders (tenant_id, code, model_id, workstation_id, quantity, status, created_by, custom_fields)
       VALUES ($1::bigint, $2, $3::uuid, $4::uuid, 1000, 'in_progress', 'spec-oee', '{}'::jsonb)
       RETURNING id`,
      [String(TENANT), CODIGO_ORDEN, modelo[0].id, workstationId],
    );

    // Cuatro horas produciendo 800 piezas con 20 defectos: 200 piezas por hora
    // sobre un objetivo de 250 → rendimiento 80 %.
    await rows(
      `INSERT INTO production_work_blocks
         (tenant_id, order_id, workstation_id, operator_id, client_event_id, type,
          start_time, end_time, produced_quantity, defect_quantity,
          is_offline_event, registered_at, version)
       VALUES ($1::bigint, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'produccion',
               '2026-07-04T08:00:00.000Z', '2026-07-04T12:00:00.000Z', 800, 20,
               false, NOW(), 1)`,
      [String(TENANT), orden[0].id, workstationId, operario[0].id, randomUUID()],
    );
  });

  afterAll(async () => {
    if (!HAS_DATABASE) return;
    await limpiarPlanta();
  });

  it('con el código y el nombre distintos, el objetivo se encuentra igual', async () => {
    const servicio = new OeeService();

    const resumen = await tenantContextStorage.run(
      { tenantId: TENANT, userId: 'spec-oee', role: 'supervisor' },
      () => servicio.getOeeSummary(workstationId, INICIO_PERIODO, FIN_PERIODO),
    );

    expect(resumen.total_produced).toBe(800);
    expect(resumen.performance).toBe(80);
    expect(resumen.quality).toBe(97.5);
    expect(resumen.oee).toBeCloseTo(78, 0); // 1 × 0,8 × 0,975
  });

  it('el criterio viejo (código contra nombre) no encontraba nada con estos datos', async () => {
    const encontrados = await rows(
      `SELECT mm.target_rate
         FROM manufacturing_models mm
         JOIN orders o ON o.tenant_id = mm.tenant_id AND o.code = mm.name
        WHERE o.tenant_id = $1::bigint`,
      [String(TENANT)],
    );

    // Sin objetivo, el rendimiento era 0 y el OEE se iba con él. Esto es lo que
    // arregla el cambio: la ligadura pasa por identificador.
    expect(encontrados).toHaveLength(0);
  });
});
