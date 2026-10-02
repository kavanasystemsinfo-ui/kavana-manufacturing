import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OeeService } from './oee.service.js';
import { postgresPool } from '../db/postgres.provider.js';
import * as tenantContext from '../auth/tenant-context.storage.js';
import { rangoOeeSchema } from './oee.rango.js';

/**
 * Contrato del OEE, que es lo que la auditoría encontró roto:
 *
 * 1. El objetivo de producción salía de comparar el CÓDIGO de la orden con el
 *    NOMBRE del modelo, así que casi nunca encontraba nada y el rendimiento
 *    caía a cero.
 * 2. Una consulta sin fechas devolvía ceros en silencio, y eso se veía en el
 *    panel como un OEE de verdad.
 * 3. El recálculo de cola escribía un rendimiento fijo de 0,85, distinto del
 *    que calculaba el panel: dos pantallas, dos números.
 */

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: { query: vi.fn() },
}));

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

const sqlEjecutado = (): string =>
  (postgresPool.query as unknown as { mock: { calls: unknown[][] } }).mock.calls
    .map((c) => String(c[0]))
    .join('\n');

describe('OEE: de dónde sale el objetivo de producción', () => {
  let service: OeeService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'admin-1',
      role: 'tenant_admin',
    });
    service = new OeeService();
  });

  it('liga la orden con su modelo por identificador, no comparando código y nombre', async () => {
    (postgresPool.query as never as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ name: 'Línea 1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            type: 'produccion',
            start_time: '2026-07-04T08:00:00Z',
            end_time: '2026-07-04T12:00:00Z',
            produced_quantity: 800,
            defect_quantity: 20,
            downtime_reason: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ target_rate: 250 }] });

    const resultado = await service.getOeeSummary('ws-1', '2026-07-04T00:00:00Z', '2026-07-04T23:59:59Z');

    const sql = sqlEjecutado();
    expect(sql).toContain('model_id');
    expect(sql).not.toContain('po.code = mm.name');

    // 800 piezas en 4 h con objetivo de 250 por hora: el rendimiento es 80.
    expect(resultado.performance).toBe(80);
    expect(resultado.oee).toBeCloseTo(78, 0); // 1 × 0,8 × 0,975 = 78
  });
});

describe('OEE: las fechas del periodo', () => {
  it('exige las dos fechas', () => {
    expect(rangoOeeSchema.safeParse({}).success).toBe(false);
    expect(rangoOeeSchema.safeParse({ startDate: '2026-07-04' }).success).toBe(false);
  });

  it('rechaza una fecha que no es una fecha', () => {
    expect(
      rangoOeeSchema.safeParse({ startDate: 'ayer', endDate: '2026-07-04T23:59:59Z' }).success,
    ).toBe(false);
  });

  it('rechaza un periodo al revés', () => {
    const resultado = rangoOeeSchema.safeParse({
      startDate: '2026-07-05T00:00:00Z',
      endDate: '2026-07-04T00:00:00Z',
    });
    expect(resultado.success).toBe(false);
  });

  it('acepta un periodo correcto', () => {
    const resultado = rangoOeeSchema.safeParse({
      startDate: '2026-07-04T00:00:00Z',
      endDate: '2026-07-04T23:59:59Z',
    });
    expect(resultado.success).toBe(true);
  });
});

describe('OEE: un cero sin partes no es un resultado', () => {
  let service: OeeService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'admin-1',
      role: 'tenant_admin',
    });
    service = new OeeService();
  });

  const simularPuesto = (bloques: unknown[]) => {
    const consulta = postgresPool.query as never as ReturnType<typeof vi.fn>;
    consulta
      .mockResolvedValueOnce({ rows: [{ id: 'ws-1', name: 'Línea 1' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Línea 1' }] })
      .mockResolvedValueOnce({ rows: bloques })
      .mockResolvedValueOnce({ rows: [{ target_rate: 250 }] });
  };

  it('avisa de que el puesto no tiene partes, en vez de enseñar un cero', async () => {
    simularPuesto([]);

    const lista = await service.getOeeByWorkstation('2026-07-04', '2026-07-04T23:59:59Z');

    expect(lista).toHaveLength(1);
    expect(lista[0]?.sin_datos).toBe(true);
  });

  it('con partes registradas el cero sí sería un resultado y se calcula', async () => {
    simularPuesto([
      {
        type: 'produccion',
        start_time: '2026-07-04T08:00:00Z',
        end_time: '2026-07-04T12:00:00Z',
        produced_quantity: 800,
        defect_quantity: 20,
        downtime_reason: null,
      },
    ]);

    const lista = await service.getOeeByWorkstation('2026-07-04', '2026-07-04T23:59:59Z');

    expect(lista[0]?.sin_datos).toBe(false);
    expect(lista[0]?.performance).toBe(80);
  });

  it('rechaza una consulta sin fechas con su motivo, no con ceros', async () => {
    await expect(service.getOeeSummary('ws-1', '', '')).rejects.toThrow(/Periodo inválido/);
    expect(sqlEjecutado()).not.toContain('production_work_blocks');
  });
});
