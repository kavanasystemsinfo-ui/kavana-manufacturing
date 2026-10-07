import { Injectable } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { tenantQuery } from '../db/tenant-query.js';
import { calcularOeeDia, num, type AcumuladoDiario, type OeeDia } from './analytics.calculo.js';

export interface ProductionDailyPoint {
  date: string;
  produced: number;
  defects: number;
  target: number;
}

export interface DowntimeReason {
  reason: string;
  occurrences: number;
  hours: number;
}

const MOTIVO_SIN_REGISTRO = 'Sin motivo registrado';

/**
 * Inicio del periodo: medianoche UTC de hoy menos (dias - 1) días. Los cortes
 * de la serie usan `AT TIME ZONE 'UTC'` en las queries, así que ambos lados
 * tienen que contar los días igual para que el primer punto no salga a medias.
 */
function inicioPeriodo(dias: number): string {
  const inicio = new Date();
  inicio.setUTCHours(0, 0, 0, 0);
  inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));
  return inicio.toISOString();
}

/**
 * Agregados diarios que alimentan el panel de supervisión: producción de los
 * últimos N días, pareto de paradas y tendencia de OEE. Todo se calcula aquí
 * con los partes reales; el frontend pinta, no inventa.
 */
@Injectable()
export class AnalyticsService {
  async getProductionDaily(dias: number): Promise<ProductionDailyPoint[]> {
    const result = await tenantQuery(
      postgresPool,
      `SELECT to_char((wb.start_time AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(wb.produced_quantity), 0) AS produced,
              COALESCE(SUM(wb.defect_quantity), 0) AS defects,
              COALESCE(SUM(mm.target_rate
                           * EXTRACT(EPOCH FROM (wb.end_time - wb.start_time)) / 3600), 0) AS target
       FROM production_work_blocks wb
       LEFT JOIN orders o ON o.tenant_id = wb.tenant_id AND o.id = wb.order_id
       LEFT JOIN manufacturing_models mm ON mm.tenant_id = o.tenant_id AND mm.id = o.model_id
       WHERE wb.tenant_id = get_current_tenant()
         AND wb.type = 'produccion'
         AND wb.start_time >= $1
       GROUP BY 1
       ORDER BY 1`,
      [inicioPeriodo(dias)],
    );

    return result.rows.map((row) => ({
      date: String(row.date),
      produced: num(row.produced),
      defects: num(row.defects),
      target: num(row.target),
    }));
  }

  async getDowntimePareto(dias: number): Promise<DowntimeReason[]> {
    const result = await tenantQuery(
      postgresPool,
      `SELECT COALESCE(NULLIF(TRIM(wb.downtime_reason), ''), '${MOTIVO_SIN_REGISTRO}') AS reason,
              COUNT(*) AS occurrences,
              COALESCE(SUM(EXTRACT(EPOCH FROM (wb.end_time - wb.start_time)) / 3600), 0) AS hours
       FROM production_work_blocks wb
       WHERE wb.tenant_id = get_current_tenant()
         AND wb.type = 'parada'
         AND wb.start_time >= $1
       GROUP BY 1
       ORDER BY hours DESC, reason ASC
       LIMIT 8`,
      [inicioPeriodo(dias)],
    );

    return result.rows.map((row) => ({
      reason: String(row.reason ?? '').trim() || MOTIVO_SIN_REGISTRO,
      occurrences: num(row.occurrences),
      hours: num(row.hours),
    }));
  }

  async getOeeDaily(dias: number): Promise<OeeDia[]> {
    const result = await tenantQuery(
      postgresPool,
      `SELECT to_char((wb.start_time AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
              wb.type,
              COALESCE(SUM(EXTRACT(EPOCH FROM (wb.end_time - wb.start_time))), 0) AS seconds,
              COALESCE(SUM(wb.produced_quantity), 0) AS produced,
              COALESCE(SUM(wb.defect_quantity), 0) AS defects,
              COALESCE(SUM(CASE WHEN wb.type = 'produccion'
                                THEN mm.target_rate
                                     * EXTRACT(EPOCH FROM (wb.end_time - wb.start_time)) / 3600
                                ELSE 0 END), 0) AS expected
       FROM production_work_blocks wb
       LEFT JOIN orders o ON o.tenant_id = wb.tenant_id AND o.id = wb.order_id
       LEFT JOIN manufacturing_models mm ON mm.tenant_id = o.tenant_id AND mm.id = o.model_id
       WHERE wb.tenant_id = get_current_tenant()
         AND wb.start_time >= $1
       GROUP BY 1, wb.type
       ORDER BY 1`,
      [inicioPeriodo(dias)],
    );

    return this.acumularSerieOee(result.rows);
  }

  /**
   * OEE por hora (UTC) para la tendencia de "Últimos 24 h" de OEE Avanzado.
   * Mismos bloques que la serie diaria, troceados por `date_trunc('hour')`;
   * la fecha sale en ISO con Z para que el gráfico la haga `new Date(...)`.
   */
  async getOeeHourly(horas: number): Promise<OeeDia[]> {
    const inicio = new Date(Date.now() - horas * 3_600_000).toISOString();
    const result = await tenantQuery(
      postgresPool,
      `SELECT to_char(date_trunc('hour', wb.start_time AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS date,
              wb.type,
              COALESCE(SUM(EXTRACT(EPOCH FROM (wb.end_time - wb.start_time))), 0) AS seconds,
              COALESCE(SUM(wb.produced_quantity), 0) AS produced,
              COALESCE(SUM(wb.defect_quantity), 0) AS defects,
              COALESCE(SUM(CASE WHEN wb.type = 'produccion'
                                THEN mm.target_rate
                                     * EXTRACT(EPOCH FROM (wb.end_time - wb.start_time)) / 3600
                                ELSE 0 END), 0) AS expected
       FROM production_work_blocks wb
       LEFT JOIN orders o ON o.tenant_id = wb.tenant_id AND o.id = wb.order_id
       LEFT JOIN manufacturing_models mm ON mm.tenant_id = o.tenant_id AND mm.id = o.model_id
       WHERE wb.tenant_id = get_current_tenant()
         AND wb.start_time >= $1
       GROUP BY 1, wb.type
       ORDER BY 1`,
      [inicio],
    );

    return this.acumularSerieOee(result.rows);
  }

  /**
   * Une las filas día/tipo (o hora/tipo) en un punto por periodo y calcula el
   * OEE. El OEE se ve sobre el periodo completo, así que antes hay que
   * juntar produccion y parada.
   */
  private acumularSerieOee(rows: Record<string, unknown>[]): OeeDia[] {
    const porDia = new Map<string, AcumuladoDiario>();
    for (const row of rows) {
      const date = String(row.date);
      const acumulado =
        porDia.get(date) ?? { date, prodSec: 0, stopSec: 0, produced: 0, defects: 0, expected: 0 };

      if (row.type === 'produccion') {
        acumulado.prodSec += num(row.seconds);
        acumulado.produced += num(row.produced);
        acumulado.defects += num(row.defects);
        acumulado.expected += num(row.expected);
      } else {
        // Piezas y objetivo en un parte de parada son ruido: solo cuenta el
        // tiempo perdido.
        acumulado.stopSec += num(row.seconds);
      }
      porDia.set(date, acumulado);
    }

    return [...porDia.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(calcularOeeDia);
  }
}
