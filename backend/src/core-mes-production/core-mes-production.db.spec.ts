import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantContextStorage } from '../auth/tenant-context.storage.js';
import { CoreMesProductionService } from './core-mes-production.service.js';
import { TenantCapabilitiesService } from '../tenant-capabilities/tenant-capabilities.service.js';
import type { SyncWorkBlockDto, TransitionProductionOrderDto } from './dto.js';
import type { KavanaRole } from '../auth/tenant-context.interface.js';

// Por qué este fichero existe: los specs de servicio de este repo mockean el pool
// y comprueban la FORMA de la llamada (que se llamó, con qué argumentos), no el
// resultado. Stryker lo midió: core-mes-production.service.ts tenía 140 mutantes
// supervivientes y 0 matados. Con el pool mockeado, cambiar la lógica interna
// (el CASE del estado, el orden de la comprobación de duplicado, el operador del
// solape) no rompe ninguna aserción. Estos tests ejecutan el SQL de verdad contra
// una base migrada y leen lo que ha quedado escrito.
//
// Requiere DATABASE_URL de una base de PRUEBAS con la cadena de migraciones
// aplicada (database/scripts/e2e-setup.js). Sin esa variable el fichero se salta
// entero: no hay nada que comprobar sin base de datos. En el CI siempre está.
const HAS_DATABASE = Boolean(process.env.DATABASE_URL);

const TENANT_A = 900001n;
const TENANT_B = 900002n;
// Tenant sin esquema de campos personalizados declarado: el camino en el que
// `production_orders` no existe.
const TENANT_C = 900003n;

const ids = {
  operatorA1: randomUUID(),
  operatorA2: randomUUID(),
  operatorB1: randomUUID(),
  operatorC1: randomUUID(),
  workstationA1: randomUUID(),
  workstationA2: randomUUID(),
  workstationB1: randomUUID(),
  workstationC1: randomUUID(),
};

const TENANTS_SQL = [String(TENANT_A), String(TENANT_B), String(TENANT_C)];

const CUSTOM_FIELDS_SCHEMA = {
  production_orders: {
    fields: [{ key: 'lote', label: 'Lote', type: 'string' }],
  },
};

type Cell = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
type Row = Record<string, Cell>;

async function rows<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await postgresPool.query(sql, params);
  return result.rows as T[];
}

function service(): CoreMesProductionService {
  return new CoreMesProductionService(new TenantCapabilitiesService());
}

function asTenant<T>(tenantId: bigint, userId: string, role: KavanaRole, fn: () => Promise<T>): Promise<T> {
  return tenantContextStorage.run({ tenantId, userId, role }, fn);
}

/** Un instante del día de pruebas: el sufijo solo busca legibilidad. */
function at(hour: number, minute = 0, seconds = 0): string {
  return `2026-06-14T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000Z`;
}

function workBlock(overrides: Partial<SyncWorkBlockDto> = {}): SyncWorkBlockDto {
  return {
    id: randomUUID(),
    tenant_id: TENANT_A,
    order_id: '',
    workstation_id: ids.workstationA1,
    operator_id: ids.operatorA1,
    type: 'produccion',
    start_time: at(8),
    end_time: at(10),
    produced_quantity: 40,
    defect_quantity: 2,
    is_offline_event: false,
    ...overrides,
  } as SyncWorkBlockDto;
}

async function createOrderRow(options: {
  tenantId: bigint;
  code: string;
  workstationId: string;
  quantity?: number;
  status?: string;
  createdBy?: string;
  customFields?: Record<string, unknown>;
}): Promise<string> {
  const inserted = await rows<{ id: string }>(
    `INSERT INTO orders (tenant_id, code, quantity, workstation_id, status, created_by, custom_fields)
     VALUES ($1::bigint, $2, $3::int, $4::uuid, $5, $6, $7::jsonb)
     RETURNING id`,
    [
      String(options.tenantId),
      options.code,
      options.quantity ?? 100,
      options.workstationId,
      options.status ?? 'pending',
      options.createdBy ?? 'spec-db',
      JSON.stringify(options.customFields ?? {}),
    ],
  );
  return inserted[0].id;
}

async function orderRow(orderId: string): Promise<Row | undefined> {
  const result = await rows(
    `SELECT tenant_id, code, quantity, produced_quantity, defect_quantity, status, workstation_id, custom_fields, created_by
       FROM orders WHERE id = $1::uuid`,
    [orderId],
  );
  return result[0];
}

async function blockRows(orderId: string): Promise<Row[]> {
  return rows(
    `SELECT tenant_id, id, client_event_id, order_id, workstation_id, operator_id, type,
            start_time, end_time, downtime_reason, produced_quantity, defect_quantity,
            observations, is_offline_event, client_device_id, version, event_fingerprint
       FROM production_work_blocks WHERE order_id = $1::uuid ORDER BY start_time ASC`,
    [orderId],
  );
}

describe.skipIf(!HAS_DATABASE)('CoreMesProductionService contra base de datos real', () => {
  let orderA: string;
  let orderB: string;

  beforeAll(async () => {
    // Los hooks se ejecutan aunque la suite esté saltada, así que sin base de
    // datos no hay nada que preparar ni que limpiar.
    if (!HAS_DATABASE) return;
    // Idempotente: si una ejecución anterior murió a medias, sus tenants se
    // borran y se recrean. El borrado del tenant arrastra users, workstations,
    // orders y bloques por las claves foráneas en cascada.
    await rows(`DELETE FROM tenants WHERE id = ANY($1::bigint[])`, [TENANTS_SQL]);

    await rows(
      `INSERT INTO tenants (id, name, subdomain, status, custom_fields_schema, feature_matrix)
       VALUES ($1::bigint, 'Spec MES A', 'spec-mes-a', 'active', $4::jsonb, '{}'::jsonb),
              ($2::bigint, 'Spec MES B', 'spec-mes-b', 'active', $4::jsonb, '{}'::jsonb),
              ($3::bigint, 'Spec MES C', 'spec-mes-c', 'active', '{}'::jsonb, '{}'::jsonb)`,
      [...TENANTS_SQL, JSON.stringify(CUSTOM_FIELDS_SCHEMA)],
    );

    for (const [tenantId, user, role, username] of [
      [TENANT_A, ids.operatorA1, 'operario', 'spec-operario-a1'],
      [TENANT_A, ids.operatorA2, 'operario', 'spec-operario-a2'],
      [TENANT_B, ids.operatorB1, 'operario', 'spec-operario-b1'],
      [TENANT_C, ids.operatorC1, 'operario', 'spec-operario-c1'],
    ] as const) {
      await rows(
        `INSERT INTO users (tenant_id, id, username, password_hash, role)
         VALUES ($1::bigint, $2::uuid, $3, 'spec:hash', $4)`,
        [String(tenantId), user, username, role],
      );
    }

    for (const [tenantId, workstationId, code] of [
      [TENANT_A, ids.workstationA1, 'SPEC-WS-A1'],
      [TENANT_A, ids.workstationA2, 'SPEC-WS-A2'],
      [TENANT_B, ids.workstationB1, 'SPEC-WS-B1'],
      [TENANT_C, ids.workstationC1, 'SPEC-WS-C1'],
    ] as const) {
      await rows(
        `INSERT INTO workstations (tenant_id, id, code, name) VALUES ($1::bigint, $2::uuid, $3, $4)`,
        [String(tenantId), workstationId, code, `Puesto ${code}`],
      );
    }
  });

  afterAll(async () => {
    if (!HAS_DATABASE) return;
    await rows(`DELETE FROM tenants WHERE id = ANY($1::bigint[])`, [TENANTS_SQL]);
    // El pool es de este fichero (vitest aísla el grafo de módulos por fichero):
    // cerrarlo evita que el runner se quede esperando una conexión ociosa.
    await postgresPool.end();
  });

  beforeEach(async () => {
    if (!HAS_DATABASE) return;
    // Borrar las órdenes arrastra sus bloques (fk_pwb_orders_tenant ON DELETE CASCADE).
    await rows(`DELETE FROM orders WHERE tenant_id = ANY($1::bigint[])`, [TENANTS_SQL]);
    orderA = await createOrderRow({ tenantId: TENANT_A, code: 'SPEC-A-ORDER', workstationId: ids.workstationA1 });
    orderB = await createOrderRow({ tenantId: TENANT_B, code: 'SPEC-B-ORDER', workstationId: ids.workstationB1 });
  });

  describe('syncWorkBlock', () => {
    it('registra el bloque y acumula la producción en la orden', async () => {
      const dto = workBlock({ order_id: orderA, produced_quantity: 40, defect_quantity: 2 });

      const result = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto));

      expect(result.synced).toBe(true);
      expect(result.client_event_id).toBe(dto.id);
      expect(Number(result.order.produced_quantity)).toBe(40);
      expect(Number(result.order.defect_quantity)).toBe(2);
      expect(result.order.status).toBe('in_progress');

      const stored = (await blockRows(orderA))[0];
      expect(stored.client_event_id).toBe(dto.id);
      expect(stored.operator_id).toBe(ids.operatorA1);
      expect(stored.workstation_id).toBe(ids.workstationA1);
      expect(stored.type).toBe('produccion');
      expect(Number(stored.produced_quantity)).toBe(40);
      expect(Number(stored.defect_quantity)).toBe(2);
      // Un bloque de producción no lleva motivo de parada, ni observaciones, ni
      // dispositivo, y arranca en la versión 1.
      expect(stored.downtime_reason).toBeNull();
      expect(stored.observations).toBeNull();
      expect(stored.client_device_id).toBeNull();
      expect(stored.is_offline_event).toBe(false);
      expect(stored.version).toBe(1);
      expect(typeof stored.event_fingerprint).toBe('string');
      expect(stored.event_fingerprint).toHaveLength(64);
    });

    it('suma las cantidades de varios bloques en la misma orden', async () => {
      const first = workBlock({ order_id: orderA, produced_quantity: 30, defect_quantity: 0, start_time: at(6), end_time: at(7) });
      const second = workBlock({ order_id: orderA, produced_quantity: 12, defect_quantity: 1, start_time: at(7), end_time: at(8) });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', async () => {
        await service().syncWorkBlock(first);
        return service().syncWorkBlock(second);
      });

      const order = await orderRow(orderA);
      expect(Number(order?.produced_quantity)).toBe(42);
      expect(Number(order?.defect_quantity)).toBe(1);
    });

    it('no revive una orden ya cerrada al registrar un bloque nuevo', async () => {
      const closed = await createOrderRow({
        tenantId: TENANT_A,
        code: 'SPEC-A-CLOSED',
        workstationId: ids.workstationA1,
        status: 'completed',
      });
      const dto = workBlock({ order_id: closed, produced_quantity: 25 });

      const result = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto));

      expect(result.order.status).toBe('completed');
      expect(Number(result.order.produced_quantity)).toBe(25);
    });

    it('trata como ya sincronizado el MISMO hecho con otro uuid (sin duplicar producción)', async () => {
      const original = workBlock({ order_id: orderA, produced_quantity: 40 });
      // Mismo hecho de producción: mismo operario, tramo, tipo y cantidades.
      // Solo cambia el uuid, que es justo el caso del reenvío del motor offline.
      const replayed = { ...original, id: randomUUID() };

      const first = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(original));
      const second = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(replayed));

      expect(first.synced).toBe(true);
      expect(second.synced).toBe(true);
      expect(await blockRows(orderA)).toHaveLength(1);
      expect(Number(second.order.produced_quantity)).toBe(40);
      expect(Number((await orderRow(orderA))?.produced_quantity)).toBe(40);
    });

    it('devuelve la orden sin insertar nada cuando se reenvía el mismo evento', async () => {
      const dto = workBlock({ order_id: orderA, produced_quantity: 15 });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto));
      const replay = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto));

      expect(replay.client_event_id).toBe(dto.id);
      expect(replay.order.code).toBe('SPEC-A-ORDER');
      expect(await blockRows(orderA)).toHaveLength(1);
      expect(Number((await orderRow(orderA))?.produced_quantity)).toBe(15);
    });

    it('rechaza el solape con otro bloque del mismo operario y no escribe nada', async () => {
      const first = workBlock({ order_id: orderA, produced_quantity: 10, start_time: at(8), end_time: at(10) });
      // Cantidad distinta a propósito: el solape tiene que decidirse DESPUÉS de
      // la huella de duplicado. Si la huella no incluyera las cantidades, estos
      // dos bloques serían "el mismo hecho" y el servicio respondería
      // "ya sincronizado" en vez del error de solape.
      const overlapping = workBlock({ order_id: orderA, produced_quantity: 20, start_time: at(9), end_time: at(11) });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(first));

      // Mensaje EXACTO, no subcadena: el error envuelto (`Sync operation failed: …`)
      // también contiene este texto, así que un `toThrow(<subcadena>)` daba por
      // bueno el camino equivocado.
      const error = await asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
        service().syncWorkBlock(overlapping),
      ).catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toBe(
        'El bloque de tiempo se solapa con otro registro existente para este operario.',
      );

      expect(await blockRows(orderA)).toHaveLength(1);
      expect(Number((await orderRow(orderA))?.produced_quantity)).toBe(10);
    });

    it('permite el mismo tramo a otro operario', async () => {
      const first = workBlock({ order_id: orderA, produced_quantity: 10, start_time: at(8), end_time: at(10) });
      const other = workBlock({
        order_id: orderA,
        operator_id: ids.operatorA2,
        produced_quantity: 5,
        start_time: at(8),
        end_time: at(10),
      });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', async () => {
        await service().syncWorkBlock(first);
        return service().syncWorkBlock(other);
      });

      expect(await blockRows(orderA)).toHaveLength(2);
      expect(Number((await orderRow(orderA))?.produced_quantity)).toBe(15);
    });

    it('un bloque de parada guarda el motivo y no incrementa la producción', async () => {
      const production = workBlock({ order_id: orderA, produced_quantity: 40, start_time: at(6), end_time: at(8) });
      const downtime = workBlock({
        order_id: orderA,
        type: 'parada',
        downtime_reason: 'Avería de utillaje',
        produced_quantity: undefined,
        defect_quantity: undefined,
        start_time: at(8),
        end_time: at(9),
      });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', async () => {
        await service().syncWorkBlock(production);
        return service().syncWorkBlock(downtime);
      });

      const stored = (await blockRows(orderA)).find((block) => block.type === 'parada');
      expect(stored?.downtime_reason).toBe('Avería de utillaje');
      // Una parada no produce: sus cantidades quedan a cero aunque el DTO no las traiga.
      expect(Number(stored?.produced_quantity)).toBe(0);
      expect(Number(stored?.defect_quantity)).toBe(0);
      expect(Number((await orderRow(orderA))?.produced_quantity)).toBe(40);
    });

    it('guarda observaciones, evento offline y dispositivo', async () => {
      const dto = workBlock({
        order_id: orderA,
        observations: 'Sin incidencias reseñables',
        is_offline_event: true,
        client_device_id: 'tablet-hmi-07',
      });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto));

      const stored = (await blockRows(orderA))[0];
      expect(stored.observations).toBe('Sin incidencias reseñables');
      expect(stored.is_offline_event).toBe(true);
      expect(stored.client_device_id).toBe('tablet-hmi-07');
    });

    it('una observación vacía se guarda como NULL, no como cadena vacía', async () => {
      const dto = workBlock({ order_id: orderA, observations: '' });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto));

      expect((await blockRows(orderA))[0].observations).toBeNull();
    });

    it('escribe el tenant del token e ignora el tenant_id que venga en el evento', async () => {
      const dto = workBlock({ order_id: orderA, tenant_id: TENANT_B });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto));

      const stored = (await blockRows(orderA))[0];
      expect(String(stored.tenant_id)).toBe(String(TENANT_A));
    });

    it('el mismo hecho en otro tenant no se considera duplicado', async () => {
      const forA = workBlock({ order_id: orderA, produced_quantity: 40, start_time: at(8), end_time: at(10) });
      const forB = workBlock({
        order_id: orderB,
        tenant_id: TENANT_B,
        workstation_id: ids.workstationB1,
        operator_id: ids.operatorB1,
        produced_quantity: 40,
        start_time: at(8),
        end_time: at(10),
      });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(forA));
      await asTenant(TENANT_B, ids.operatorB1, 'operario', () => service().syncWorkBlock(forB));

      expect(await blockRows(orderA)).toHaveLength(1);
      expect(await blockRows(orderB)).toHaveLength(1);
      expect(Number((await orderRow(orderB))?.produced_quantity)).toBe(40);
    });

    it('reasigna el puesto de la orden al puesto del evento', async () => {
      const moved = await createOrderRow({
        tenantId: TENANT_A,
        code: 'SPEC-A-MOVED',
        workstationId: ids.workstationA2,
      });
      const dto = workBlock({ order_id: moved, workstation_id: ids.workstationA1 });

      const result = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto));

      expect(result.order.workstation_id).toBe(ids.workstationA1);
      expect((await orderRow(moved))?.workstation_id).toBe(ids.workstationA1);
    });

    it('rechaza una orden que no existe y no deja rastro', async () => {
      const dto = workBlock({ order_id: randomUUID() });

      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto)),
      ).rejects.toThrow('The requested production order does not exist or you do not have permission.');

      expect(await rows(`SELECT id FROM production_work_blocks WHERE client_event_id = $1::uuid`, [dto.id])).toHaveLength(0);
    });

    it('rechaza una orden de otro tenant', async () => {
      const dto = workBlock({ order_id: orderB });

      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto)),
      ).rejects.toThrow(BadRequestException);

      expect(await blockRows(orderB)).toHaveLength(0);
      expect(Number((await orderRow(orderB))?.produced_quantity)).toBe(0);
    });
  });

  describe('transitionOrder', () => {
    it('arranca la orden sin cambiar el puesto si el DTO no lo trae', async () => {
      const dto: TransitionProductionOrderDto = { target_status: 'in_progress' };

      const result = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().transitionOrder(orderA, dto));

      expect(result.status).toBe('in_progress');
      expect(result.workstation_id).toBe(ids.workstationA1);
    });

    it('asigna el puesto indicado al arrancar', async () => {
      const dto: TransitionProductionOrderDto = { target_status: 'in_progress', workstation_id: ids.workstationA2 };

      const result = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().transitionOrder(orderA, dto));

      expect(result.workstation_id).toBe(ids.workstationA2);
      expect((await orderRow(orderA))?.workstation_id).toBe(ids.workstationA2);
    });

    it('cierra la orden sin puesto indicado', async () => {
      const dto: TransitionProductionOrderDto = { target_status: 'completed' };

      const result = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().transitionOrder(orderA, dto));

      expect(result.status).toBe('completed');
    });

    it('rechaza una orden inexistente', async () => {
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().transitionOrder(randomUUID(), { target_status: 'in_progress' } as TransitionProductionOrderDto),
        ),
      ).rejects.toThrow('The requested production order does not exist or you do not have permission.');
    });

    it('no deja que un tenant transicione la orden de otro', async () => {
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().transitionOrder(orderB, { target_status: 'completed' } as TransitionProductionOrderDto),
        ),
      ).rejects.toThrow(BadRequestException);

      expect((await orderRow(orderB))?.status).toBe('pending');
    });

    it('un identificador que la base de datos no puede castear sale como error de la transacción', async () => {
      // El controller valida el uuid antes de llegar aquí, así que este camino
      // solo lo abre un fallo de la consulta. Lo que se fija es que el error NO
      // se disfraza de 400: se envuelve como fallo de la mutación de estado.
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().transitionOrder('no-es-un-uuid', { target_status: 'completed' } as TransitionProductionOrderDto),
        ),
      ).rejects.toThrow('Production state mutation aborted');
    });
  });

  describe('updateCustomFields', () => {
    it('guarda los campos personalizados declarados por el tenant', async () => {
      const result = await asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
        service().updateCustomFields(orderA, { custom_fields: { lote: 'L-2026-14' } }),
      );

      expect(result.custom_fields).toEqual({ lote: 'L-2026-14' });
      expect((await orderRow(orderA))?.custom_fields).toEqual({ lote: 'L-2026-14' });
    });

    it('rechaza un campo que el tenant no ha declarado y no toca la fila', async () => {
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().updateCustomFields(orderA, { custom_fields: { inventado: 'x' } }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect((await orderRow(orderA))?.custom_fields).toEqual({});
    });

    it('rechaza una orden inexistente', async () => {
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().updateCustomFields(randomUUID(), { custom_fields: { lote: 'L-1' } }),
        ),
      ).rejects.toThrow('The requested production order does not exist or you do not have permission.');
    });

    it('rechaza la orden de otro tenant', async () => {
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().updateCustomFields(orderB, { custom_fields: { lote: 'L-1' } }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect((await orderRow(orderB))?.custom_fields).toEqual({});
    });
  });

  describe('consultas', () => {
    it('createOrder crea la orden pendiente, a cero y con sus campos personalizados', async () => {
      const created = await asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
        service().createOrder({
          code: 'SPEC-A-NEW',
          target_quantity: 250,
          workstation_id: ids.workstationA1,
          custom_fields: { lote: 'L-9' },
        }),
      );

      expect(created.status).toBe('pending');
      expect(created.quantity).toBe(250);
      expect(Number(created.produced_quantity)).toBe(0);
      expect(Number(created.defect_quantity)).toBe(0);
      expect(created.custom_fields).toEqual({ lote: 'L-9' });
      expect(Number(created.tenant_id ?? TENANT_A)).toBe(Number(TENANT_A));

      const stored = await orderRow(created.id);
      expect(stored?.code).toBe('SPEC-A-NEW');
      expect(stored?.created_by).toBe(ids.operatorA1);
      expect(String(stored?.tenant_id)).toBe(String(TENANT_A));
    });

    it('createOrder rechaza campos personalizados no declarados y no inserta la orden', async () => {
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().createOrder({
            code: 'SPEC-A-BAD',
            target_quantity: 10,
            workstation_id: ids.workstationA1,
            custom_fields: { inventado: 'x' },
          }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(await rows(`SELECT id FROM orders WHERE code = 'SPEC-A-BAD'`)).toHaveLength(0);
    });

    it('listOrders y getOrder solo ven las órdenes del tenant del token', async () => {
      const listed = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().listOrders());

      expect(listed.map((order) => order.code)).toEqual(['SPEC-A-ORDER']);
      expect(await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().getOrder(orderB))).toBeNull();
      expect(await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().getOrder(randomUUID()))).toBeNull();
      expect((await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().getOrder(orderA)))?.code).toBe('SPEC-A-ORDER');
    });

    it('listOrderLogs devuelve los bloques de la orden ordenados por hora de inicio', async () => {
      const late = workBlock({ order_id: orderA, start_time: at(12), end_time: at(13), produced_quantity: 5 });
      const early = workBlock({ order_id: orderA, operator_id: ids.operatorA2, start_time: at(6), end_time: at(7), produced_quantity: 7 });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', async () => {
        await service().syncWorkBlock(late);
        return service().syncWorkBlock(early);
      });

      const logs = await asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().listOrderLogs(orderA));

      expect(logs).toHaveLength(2);
      expect(logs.map((log) => Number(log.produced_quantity))).toEqual([7, 5]);
      expect(logs.every((log) => log.order_id === orderA)).toBe(true);
    });

    it('listMyTimeLogs usa el operario del token y respeta los límites del rango', async () => {
      const mine = workBlock({ order_id: orderA, start_time: at(8), end_time: at(9), produced_quantity: 4 });
      const mineLater = workBlock({ order_id: orderA, start_time: at(11), end_time: at(12), produced_quantity: 6 });
      const other = workBlock({
        order_id: orderA,
        operator_id: ids.operatorA2,
        start_time: at(8),
        end_time: at(9),
        produced_quantity: 9,
      });

      await asTenant(TENANT_A, ids.operatorA1, 'operario', async () => {
        await service().syncWorkBlock(mine);
        await service().syncWorkBlock(mineLater);
        return service().syncWorkBlock(other);
      });

      const logs = await asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
        service().listMyTimeLogs({ from: at(8), to: at(11) }),
      );

      // El bloque que empieza justo en `to` queda fuera: el rango es [from, to).
      expect(logs).toHaveLength(1);
      expect(logs.map((log) => log.id)).toEqual([mine.id]);
      expect(logs[0].operator_id).toBe(ids.operatorA1);
    });
  });

  // Segunda ronda: los mutantes que sobrevivieron a la primera pasada del spec.
  // Son, casi todos, caminos que el primer spec no tocaba: mensajes exactos,
  // errores que vienen de la base de datos y el tenant que no ha declarado
  // ningún campo personalizado.
  describe('fallos de base de datos y mensajes', () => {
    it('createOrder envuelve un error de la base de datos en un 500 explícito', async () => {
      await asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
        service().createOrder({
          code: 'SPEC-A-DUP',
          target_quantity: 5,
          workstation_id: ids.workstationA1,
          custom_fields: {},
        }),
      );

      // El código de orden es único por tenant (idx_orders_tenant_code):
      // la segunda inserción choca y el servicio no puede tragárselo.
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().createOrder({
            code: 'SPEC-A-DUP',
            target_quantity: 5,
            workstation_id: ids.workstationA1,
            custom_fields: {},
          }),
        ),
      ).rejects.toThrow('Production command failed');
    });

    it('createOrder dice qué campo personalizado es el inválido', async () => {
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().createOrder({
            code: 'SPEC-A-MSG',
            target_quantity: 5,
            workstation_id: ids.workstationA1,
            custom_fields: { inventado: 'x' },
          }),
        ),
      ).rejects.toThrow('Invalid custom fields');
    });

    it('updateCustomFields dice qué campo personalizado es el inválido', async () => {
      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () =>
          service().updateCustomFields(orderA, { custom_fields: { inventado: 'x' } }),
        ),
      ).rejects.toThrow('Invalid custom fields');
    });

    it('syncWorkBlock envuelve como BadRequest el fallo que viene de la base de datos', async () => {
      // Operario de OTRO tenant: la clave foránea (tenant_id, operator_id) lo
      // rechaza y el servicio convierte el error en un 400 con su contexto.
      const dto = workBlock({ order_id: orderA, operator_id: ids.operatorB1 });

      await expect(
        asTenant(TENANT_A, ids.operatorA1, 'operario', () => service().syncWorkBlock(dto)),
      ).rejects.toThrow('Sync operation failed');

      expect(await blockRows(orderA)).toHaveLength(0);
    });

    it('un tenant sin esquema de campos personalizados acepta órdenes sin campos y rechaza inventados', async () => {
      const plain = await asTenant(TENANT_C, ids.operatorC1, 'operario', () =>
        service().createOrder({
          code: 'SPEC-C-PLAIN',
          target_quantity: 3,
          workstation_id: ids.workstationC1,
          custom_fields: {},
        }),
      );

      expect(plain.status).toBe('pending');

      await expect(
        asTenant(TENANT_C, ids.operatorC1, 'operario', () =>
          service().createOrder({
            code: 'SPEC-C-EXTRA',
            target_quantity: 3,
            workstation_id: ids.workstationC1,
            custom_fields: { lote: 'L-1' },
          }),
        ),
      ).rejects.toThrow('Invalid custom fields');
    });
  });
});
