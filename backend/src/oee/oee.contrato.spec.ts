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

vi.mock('../db/postgres.provider.js', () => {
  const createMockClient = () => {
    const queryMock = vi.fn();
    return {
      query: queryMock,
      release: vi.fn(),
      _queryMock: queryMock,
    };
  };

  // Create mock client eagerly so tests can access it before connect() is called
  const mockClient = createMockClient();

  return {
    postgresPool: {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient),
      _getMockClient: () => mockClient,
    },
  };
});

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

const sqlEjecutado = (): string => {
    const mockClient = (postgresPool as any)._getMockClient?.();
    if (!mockClient) return '';
    return (mockClient._queryMock as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((c) => String(c[0]))
      .join('\\n');
  };

describe('OEE: de dónde sale el objetivo de producción', () => {
  let service: OeeService;

  beforeEach(() => {
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'admin-1',
      role: 'tenant_admin',
    });
    // Reset only the query mock, not connect
    const mockClient = (postgresPool as any)._getMockClient();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    service = new OeeService();
  });

  it('liga la orden con su modelo por identificador, no comparando código y nombre', async () => {
    const mockClient = (postgresPool as any)._getMockClient();
    const queryCalls: string[] = [];

    mockClient.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      queryCalls.push(sql);
      
      // Sequence: BEGIN -> set_config -> actual query -> COMMIT
      if (sql.includes('BEGIN')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('set_config')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('SELECT name FROM workstations')) {
        return { rows: [{ name: 'Línea 1' }], rowCount: 1 };
      }
      if (sql.includes('FROM production_work_blocks')) {
        return {
          rows: [{
            type: 'produccion',
            start_time: '2026-07-04T08:00:00Z',
            end_time: '2026-07-04T12:00:00Z',
            produced_quantity: 800,
            defect_quantity: 20,
            downtime_reason: null,
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('SELECT mm.target_rate')) {
        return { rows: [{ target_rate: 250 }], rowCount: 1 };
      }
      if (sql.includes('COMMIT')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    const resultado = await service.getOeeSummary('ws-1', '2026-07-04T00:00:00Z', '2026-07-04T23:59:59Z');

    const sql = queryCalls.join('\\n');
    expect(sql).toContain('model_id');
    expect(sql).not.toContain('po.code = mm.name');

    expect(resultado.performance).toBe(80);
    expect(resultado.oee).toBeCloseTo(78, 0);
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
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'admin-1',
      role: 'tenant_admin',
    });
    // Reset only the query mock, not connect
    const mockClient = (postgresPool as any)._getMockClient();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    service = new OeeService();
  });

  const simularPuesto = (bloques: unknown[]): string[] => {
    const mockClient = (postgresPool as any)._getMockClient();
    const queryCalls: string[] = [];

    mockClient.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      queryCalls.push(sql);

      if (sql.includes('BEGIN')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('set_config')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('workstations') && sql.includes('w.id') && sql.includes('w.name')) {
        return { rows: [{ id: 'ws-1', name: 'Línea 1' }], rowCount: 1 };
      }
      if (sql.includes('workstations') && sql.includes('tenant_id') && sql.includes('id =')) {
        return { rows: [{ name: 'Línea 1' }], rowCount: 1 };
      }
      if (sql.includes('FROM production_work_block')) {
        return { rows: bloques, rowCount: bloques.length };
      }
      if (sql.includes('target_rate')) {
        return { rows: [{ target_rate: 250 }], rowCount: 1 };
      }
      if (sql.includes('COMMIT')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    return queryCalls;
  };

  it('avisa de que el puesto no tiene partes, en vez de enseñar un cero', async () => {
    const queryCalls = simularPuesto([]);

    const lista = await service.getOeeByWorkstation('2026-07-04', '2026-07-04T23:59:59Z');

    expect(lista).toHaveLength(1);
    expect(lista[0]?.sin_datos).toBe(true);
  });

  it('con partes registradas el cero sí sería un resultado y se calcula', async () => {
    const queryCalls = simularPuesto([
      {
        type: 'produccion',
        start_time: '2026-07-04T08:00:00Z',
        end_time: '2026-07-04T12:00:00Z',
        produced_quantity: 800,
        defect_quantity: 20,
        downtime_reason: null,
      },
    ]);

    const lista = await service.getOeeByWorkstation('2026-07-04T00:00:00Z', '2026-07-04T23:59:59Z');

    expect(lista[0]?.sin_datos).toBe(false);
    expect(lista[0]?.performance).toBe(80);
  });

  it('rechaza una consulta sin fechas con su motivo, no con ceros', async () => {
    const queryCalls = simularPuesto([]);

    await expect(service.getOeeSummary('ws-1', '', '')).rejects.toThrow(/Periodo inválido/);
    const sql = queryCalls.join('\\n');
    expect(sql).not.toContain('production_work_blocks');
  });
});
