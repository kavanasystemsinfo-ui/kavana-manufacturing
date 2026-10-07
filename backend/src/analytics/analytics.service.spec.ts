import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AnalyticsService } from './analytics.service.js';
import { tenantQuery } from '../db/tenant-query.js';

/**
 * El panel de supervisi�n pintaba series de production con n�meros basura
 * ("01827.00001328.0000...") porque NUMERIC llega como string de pg y nadie
 * lo convert�a. Aqu� se fija el contrato del endpoint: n�meros de verdad en
 * la salida, d�as completos en la entrada y OEE calculado, no inventado.
 */

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: {},
}));

vi.mock('../db/tenant-query.js', () => ({
  tenantQuery: vi.fn(),
}));

const comoConsulta = tenantQuery as unknown as ReturnType<typeof vi.fn>;

function devolverFila(fila: Record<string, unknown> | Record<string, unknown>[]) {
  comoConsulta.mockResolvedValueOnce({ rows: Array.isArray(fila) ? fila : [fila] });
}

describe('AnalyticsService.getProductionDaily', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AnalyticsService();
  });

  it('convierte los NUMERIC de pg en n�meros, no concatena strings', async () => {
    devolverFila({ date: '2026-10-07', produced: '1827.0000', defects: '12.0000', target: '4500.0000' });

    const serie = await service.getProductionDaily(30);

    expect(serie).toEqual([
      { date: '2026-10-07', produced: 1827, defects: 12, target: 4500 },
    ]);
    for (const punto of serie) {
      expect(typeof punto.produced).toBe('number');
      expect(typeof punto.target).toBe('number');
    }
  });

  it('pide solo bloques de producci�n del tenant desde el inicio del periodo', async () => {
    devolverFila([]);

    await service.getProductionDaily(7);

    expect(comoConsulta).toHaveBeenCalledTimes(1);
    const [, sql, params] = comoConsulta.mock.calls[0];
    expect(sql).toContain("wb.type = 'produccion'");
    expect(sql).toContain('get_current_tenant()');
    expect(sql).toContain('GROUP BY');
    expect(params).toHaveLength(1);
    expect(Number.isNaN(Date.parse(String(params[0])))).toBe(false);
  });

  it('trata un valor ilegible como cero en vez de propagar NaN', async () => {
    devolverFila({ date: '2026-10-07', produced: 'no-es-un-numero', defects: null, target: undefined });

    const serie = await service.getProductionDaily(30);

    expect(serie[0]).toEqual({ date: '2026-10-07', produced: 0, defects: 0, target: 0 });
  });
});

describe('AnalyticsService.getDowntimePareto', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AnalyticsService();
  });

  it('devuelve horas y ocurrencias como n�meros', async () => {
    devolverFila({ reason: 'Ruido excesivo', occurrences: 4, hours: '3.5000000000' });

    const pareto = await service.getDowntimePareto(30);

    expect(pareto).toEqual([
      { reason: 'Ruido excesivo', occurrences: 4, hours: 3.5 },
    ]);
  });

  it('agrupa los motivos vac�os en un r�tulo legible', async () => {
    devolverFila([
      { reason: '   ', occurrences: 2, hours: '1.0' },
      { reason: null, occurrences: 1, hours: '0.5' },
    ]);

    const pareto = await service.getDowntimePareto(30);

    expect(pareto.map((r) => r.reason)).toEqual(['Sin motivo registrado', 'Sin motivo registrado']);
  });

  it('acota el periodo y consulta solo paradas', async () => {
    devolverFila([]);

    await service.getDowntimePareto(30);

    const [, sql] = comoConsulta.mock.calls[0];
    expect(sql).toContain("wb.type = 'parada'");
    expect(sql).toContain('downtime_reason');
    expect(sql).toContain('ORDER BY');
  });
});

describe('AnalyticsService.getOeeDaily', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AnalyticsService();
  });

  it('calcula el OEE del d�a con las f�rmulas del panel (80/80/97,5 -> 62,4)', async () => {
    devolverFila([
      { date: '2026-07-04', type: 'produccion', seconds: '14400', produced: '800', defects: '20', expected: '1000' },
      { date: '2026-07-04', type: 'parada', seconds: '3600', produced: null, defects: null, expected: '0' },
    ]);

    const serie = await service.getOeeDaily(7);

    expect(serie).toHaveLength(1);
    expect(serie[0].date).toBe('2026-07-04');
    expect(serie[0].availability).toBe(80);
    expect(serie[0].performance).toBe(80);
    expect(serie[0].quality).toBe(97.5);
    expect(serie[0].oee).toBe(62.4);
  });

  it('no mete el tiempo de parada en el rendimiento ni en la calidad', async () => {
    devolverFila([
      { date: '2026-07-05', type: 'parada', seconds: '7200', produced: '500', defects: '0', expected: '9999' },
    ]);

    const serie = await service.getOeeDaily(7);

    // Solo paradas registradas: el d�a no produjo, y un cero aqu� es un cero
    // de verdad (sin rendimiento que cobrar), no un 100 % de mentira.
    expect(serie[0].performance).toBe(0);
    expect(serie[0].quality).toBe(0);
    expect(serie[0].availability).toBe(0);
    expect(serie[0].oee).toBe(0);
  });

  it('acumula varios bloques del mismo d�a en un solo punto de la serie', async () => {
    devolverFila([
      { date: '2026-07-06', type: 'produccion', seconds: '3600', produced: '250', defects: '0', expected: '250' },
      { date: '2026-07-06', type: 'produccion', seconds: '3600', produced: '200', defects: '10', expected: '250' },
      { date: '2026-07-06', type: 'parada', seconds: '1800', produced: null, defects: null, expected: null },
    ]);

    const serie = await service.getOeeDaily(7);

    expect(serie).toHaveLength(1);
    expect(serie[0].availability).toBe(80);
    expect(serie[0].performance).toBe(90);
    expect(serie[0].quality).toBe(97.78);
    expect(serie[0].oee).toBe(70.4);
  });

  it('devuelve la serie ordenada por d�a', async () => {
    devolverFila([
      { date: '2026-07-08', type: 'produccion', seconds: '3600', produced: '250', defects: '0', expected: '250' },
      { date: '2026-07-06', type: 'produccion', seconds: '3600', produced: '250', defects: '0', expected: '250' },
      { date: '2026-07-07', type: 'produccion', seconds: '3600', produced: '250', defects: '0', expected: '250' },
    ]);

    const serie = await service.getOeeDaily(7);

    expect(serie.map((p) => p.date)).toEqual(['2026-07-06', '2026-07-07', '2026-07-08']);
  });
});

describe('AnalyticsService.getOeeHourly', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AnalyticsService();
  });

  it('agrupa por hora UTC con fecha ISO parseable por el grafico', async () => {
    devolverFila([
      { date: '2026-10-07T08:00:00Z', type: 'produccion', seconds: '3600', produced: '250', defects: '0', expected: '250' },
      { date: '2026-10-07T08:00:00Z', type: 'parada', seconds: '900', produced: null, defects: null, expected: null },
    ]);

    const serie = await service.getOeeHourly(24);

    expect(serie).toHaveLength(1);
    expect(serie[0].date).toBe('2026-10-07T08:00:00Z');
    expect(serie[0].availability).toBe(80);
    expect(serie[0].oee).toBe(80);
    expect(Number.isNaN(Date.parse(serie[0].date))).toBe(false);
  });

  it('acota la ventana a las horas pedidas y usa date_trunc de hora', async () => {
    devolverFila([]);

    const antes = Date.now();
    await service.getOeeHourly(24);

    const [, sql, params] = comoConsulta.mock.calls[0];
    expect(sql).toContain("date_trunc('hour'");
    expect(sql).toContain('get_current_tenant()');
    expect(params).toHaveLength(1);
    const desde = Date.parse(String(params[0]));
    expect(Number.isNaN(desde)).toBe(false);
    // La ventana empieza ~24 h atras (tolerancia de 60 s por el reloj).
    expect(antes - desde).toBeGreaterThan(24 * 3600 * 1000 - 60_000);
    expect(antes - desde).toBeLessThan(24 * 3600 * 1000 + 60_000);
  });

  it('acumula bloques del mismo hueco horario en un solo punto', async () => {
    devolverFila([
      { date: '2026-10-07T09:00:00Z', type: 'produccion', seconds: '3600', produced: '200', defects: '0', expected: '250' },
      { date: '2026-10-07T09:00:00Z', type: 'produccion', seconds: '3600', produced: '50', defects: '10', expected: '250' },
      { date: '2026-10-07T09:00:00Z', type: 'parada', seconds: '1800', produced: null, defects: null, expected: null },
    ]);

    const serie = await service.getOeeHourly(24);

    expect(serie).toHaveLength(1);
    expect(serie[0].availability).toBe(80);
    expect(serie[0].performance).toBe(50);
    expect(serie[0].quality).toBe(96);
  });
});
