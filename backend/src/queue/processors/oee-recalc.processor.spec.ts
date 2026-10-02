import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OeeRecalcProcessor } from './oee-recalc.processor.js';
import { postgresPool } from '../../db/postgres.provider.js';

/**
 * El recálculo y el panel tienen que dar el mismo número. Se prueba con la
 * misma jornada que usa la prueba del cálculo: cuatro horas produciendo 800
 * piezas con 20 defectos, una hora parada y un objetivo de 250 por hora.
 * Disponibilidad 80 %, rendimiento 80 %, calidad 97,5 %, OEE 62,4 %.
 */

vi.mock('../../db/postgres.provider.js', () => ({
  postgresPool: { connect: vi.fn() },
}));

const PARTES = [
  {
    workstation_id: 'ws-1',
    dia: '2026-07-04',
    type: 'produccion',
    start_time: '2026-07-04T08:00:00.000Z',
    end_time: '2026-07-04T12:00:00.000Z',
    produced_quantity: '800',
    defect_quantity: '20',
  },
  {
    workstation_id: 'ws-1',
    dia: '2026-07-04',
    type: 'parada',
    start_time: '2026-07-04T12:00:00.000Z',
    end_time: '2026-07-04T13:00:00.000Z',
    produced_quantity: null,
    defect_quantity: null,
  },
];

const OBJETIVOS = [
  { workstation_id: 'ws-1', dia: '2026-07-04', target_rate: '250', ms_produccion: '14400' },
];

describe('Recálculo del OEE en cola', () => {
  let consultas: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    consultas = [];
    vi.resetAllMocks();

    const cliente = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        consultas.push({ sql, params });
        if (sql.includes('DELETE FROM oee_metrics')) return { rows: [], rowCount: 0 };
        if (sql.includes('manufacturing_models')) return { rows: OBJETIVOS };
        if (sql.includes('FROM production_work_blocks')) return { rows: PARTES };
        return { rows: [], rowCount: 1 };
      }),
      release: vi.fn(),
    };

    (postgresPool.connect as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(cliente);
  });

  it('guarda los mismos números que calcula el panel', async () => {
    const procesador = new OeeRecalcProcessor();

    await procesador.process({ data: { tenantId: '1', periodDays: 7 } } as never);

    const insercion = consultas.find((c) => c.sql.includes('INSERT INTO oee_metrics'));
    expect(insercion).toBeDefined();
    expect(insercion?.params).toEqual(['1', 'ws-1', '2026-07-04', 80, 80, 97.5, 62.4]);
  });

  it('no queda ningún rendimiento inventado', async () => {
    const procesador = new OeeRecalcProcessor();

    await procesador.process({ data: { tenantId: '1', periodDays: 30 } } as never);

    const sql = consultas.map((c) => c.sql).join('\n');
    expect(sql).not.toContain('0.85');
    // Y el objetivo se liga por identificador, no comparando código con nombre.
    expect(sql).toContain('o.model_id = mm.id');
    expect(sql).not.toContain('po.code = mm.name');
  });

  it('trabaja dentro de una transacción, que es lo que necesita el contexto de cliente', async () => {
    const procesador = new OeeRecalcProcessor();

    await procesador.process({ data: { tenantId: '1' } } as never);

    const sql = consultas.map((c) => c.sql);
    expect(sql[0]).toBe('BEGIN');
    expect(sql).toContain('COMMIT');
    // El contexto se fija en la misma transacción, no fuera.
    const posicionContexto = sql.findIndex((s) => s.includes('set_config'));
    const posicionCommit = sql.indexOf('COMMIT');
    expect(posicionContexto).toBeGreaterThan(0);
    expect(posicionContexto).toBeLessThan(posicionCommit);
  });

  it('si algo falla, deshace el trabajo', async () => {
    const cliente = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('DELETE FROM oee_metrics')) throw new Error('la base dijo que no');
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };
    (postgresPool.connect as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(cliente);

    const procesador = new OeeRecalcProcessor();
    await expect(procesador.process({ data: { tenantId: '1' } } as never)).rejects.toThrow(
      'la base dijo que no',
    );

    const sql = (cliente.query as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) =>
      String(c[0]),
    );
    expect(sql).toContain('ROLLBACK');
  });
});
