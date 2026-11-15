import { BadRequestException, Injectable } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { tenantQuery } from '../db/tenant-query.js';
import { calcularOee, resumirBloques, type BloqueDeTrabajo } from './oee.calculo.js';
import { rangoOeeSchema, type RangoOee } from './oee.rango.js';

/**
 * Un periodo mal pedido no puede devolver ceros: en pantalla se leen como un
 * OEE de verdad. Se rechaza con su motivo.
 */
function validarRango(startDate: string, endDate: string): RangoOee {
  const resultado = rangoOeeSchema.safeParse({ startDate, endDate });
  if (!resultado.success) {
    throw new BadRequestException(
      `Periodo inválido: ${resultado.error.issues.map((problema) => problema.message).join('; ')}`,
    );
  }
  return resultado.data;
}

export interface OeeSummary {
  workstation_id: string;
  workstation_name: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  total_production_time_ms: number;
  total_downtime_ms: number;
  total_produced: number;
  total_defects: number;
  period_start: string;
  period_end: string;
}

export interface OeeByWorkstation {
  workstation_id: string;
  workstation_name: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  /**
   * El puesto no tiene ningún parte registrado en el periodo. Un cero aquí no
   * es un mal resultado: es que no hay nada que medir, y en pantalla debe
   * leerse así en vez de como un OEE rojo.
   */
  sin_datos: boolean;
}

export interface DowntimeBreakdown {
  reason: string;
  count: number;
  total_ms: number;
  percentage: number;
}

interface DowntimeRow {
  downtime_reason: string | null;
  reason?: string;
  count: string;
  total_ms: string;
}

@Injectable()
export class OeeService {
  async getOeeSummary(
    workstationId: string,
    startDate: string,
    endDate: string,
  ): Promise<OeeSummary> {
    const rango = validarRango(startDate, endDate);
    const context = getTenantContext();

    // Get workstation name
    const wsResult = await tenantQuery(
      postgresPool,
      `SELECT name FROM workstations WHERE tenant_id = $1 AND id = $2`,
      [String(context.tenantId), workstationId],
    );
    const wsName = wsResult.rows[0]?.name ?? 'Unknown';

    // Get production blocks
    const blocksResult = await tenantQuery(
      postgresPool,
      `SELECT type, start_time, end_time, produced_quantity, defect_quantity, downtime_reason
       FROM production_work_blocks
       WHERE tenant_id = $1 AND workstation_id = $2
         AND start_time >= $3 AND end_time <= $4
       ORDER BY start_time ASC`,
      [String(context.tenantId), workstationId, rango.startDate, rango.endDate],
    );

    const bloques = blocksResult.rows as BloqueDeTrabajo[];
    const resumen = resumirBloques(bloques);
    const targetRate = await this.getTargetRate(workstationId, rango.startDate, rango.endDate);
    const calculado = calcularOee({ bloques, targetRate });

    return {
      workstation_id: workstationId,
      workstation_name: wsName,
      availability: calculado.availability,
      performance: calculado.performance,
      quality: calculado.quality,
      oee: calculado.oee,
      total_production_time_ms: resumen.produccionMs,
      total_downtime_ms: resumen.paradaMs,
      total_produced: resumen.producidas,
      total_defects: resumen.defectuosas,
      period_start: startDate,
      period_end: endDate,
    };
  }

  /**
   * Objetivo de producción del puesto en el periodo: el del modelo de la orden
   * que de verdad produjo, y ligado por identificador.
   *
   * Antes esta consulta comparaba el CÓDIGO de la orden con el NOMBRE del
   * modelo (`po.code = mm.name`), dos cosas que no tienen por qué parecerse:
   * casi nunca había coincidencia, el objetivo salía cero y el rendimiento se
   * iba con él. El ejemplo vivo: en la demo había puestos con OEE 0 y otros con
   * valor real según qué orden cayera en el LIMIT 1.
   */
  private async getTargetRate(
    workstationId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const context = getTenantContext();

    const resultado = await tenantQuery(
      postgresPool,
      `SELECT mm.target_rate
       FROM manufacturing_models mm
       JOIN orders o ON o.tenant_id = mm.tenant_id AND o.model_id = mm.id
       JOIN production_work_blocks wb ON wb.tenant_id = o.tenant_id AND wb.order_id = o.id
       WHERE wb.tenant_id = $1 AND wb.workstation_id = $2
         AND wb.type = 'produccion'
         AND wb.start_time >= $3 AND wb.end_time <= $4
       GROUP BY mm.target_rate
       ORDER BY SUM(EXTRACT(EPOCH FROM (wb.end_time - wb.start_time))) DESC
       LIMIT 1`,
      [String(context.tenantId), workstationId, startDate, endDate],
    );

    return Number(resultado.rows[0]?.target_rate ?? 0);
  }

  async getOeeByWorkstation(
    startDate: string,
    endDate: string,
  ): Promise<OeeByWorkstation[]> {
    const rango = validarRango(startDate, endDate);
    const context = getTenantContext();

    const result = await tenantQuery(
      postgresPool,
      `SELECT w.id, w.name
       FROM workstations w
       WHERE w.tenant_id = $1 AND w.status = 'active'
       ORDER BY w.name`,
      [String(context.tenantId)],
    );

    const summaries: OeeByWorkstation[] = [];
    for (const ws of result.rows) {
      const summary = await this.getOeeSummary(ws.id, rango.startDate, rango.endDate);
      summaries.push({
        workstation_id: ws.id,
        workstation_name: ws.name,
        oee: summary.oee,
        availability: summary.availability,
        performance: summary.performance,
        quality: summary.quality,
        sin_datos: summary.total_production_time_ms === 0 && summary.total_downtime_ms === 0,
      });
    }

    return summaries;
  }

  async getDowntimeBreakdown(
    workstationId: string,
    startDate: string,
    endDate: string,
  ): Promise<DowntimeBreakdown[]> {
    const rango = validarRango(startDate, endDate);
    const context = getTenantContext();

    const result = await tenantQuery(
      postgresPool,
      `SELECT downtime_reason, COUNT(*) as count,
              SUM(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)::bigint as total_ms
       FROM production_work_blocks
       WHERE tenant_id = $1 AND workstation_id = $2
         AND type = 'parada'
         AND start_time >= $3 AND end_time <= $4
         AND downtime_reason IS NOT NULL
       GROUP BY downtime_reason
       ORDER BY total_ms DESC`,
      [String(context.tenantId), workstationId, rango.startDate, rango.endDate],
    );

    const totalDowntimeMs = result.rows.reduce(
      (sum: number, row: DowntimeRow) => sum + Number(row.total_ms),
      0,
    );

    return result.rows.map((row: DowntimeRow) => ({
      reason: row.downtime_reason ?? row.reason ?? 'Unknown',
      count: Number(row.count),
      total_ms: Number(row.total_ms),
      percentage:
        totalDowntimeMs > 0
          ? Math.round((Number(row.total_ms) / totalDowntimeMs) * 10000) / 100
          : 0,
    }));
  }

  /**
   * Línea del tiempo de los puestos en un rango (un turno): los partes reales
   * que se cruzan con el rango, puesto por puesto, y la orden en curso. Es lo
   * que dibuja la pestaña "Línea en vivo"; antes lo inventaba el navegador.
   */
  async getLiveTimeline(startDate: string, endDate: string): Promise<LiveTimelineWorkstation[]> {
    const rango = validarRango(startDate, endDate);
    const horas = (Date.parse(rango.endDate) - Date.parse(rango.startDate)) / 3600000;
    if (horas > MAX_HORAS_LINEA_EN_VIVO) {
      throw new BadRequestException(`Periodo demasiado largo: la línea en vivo admite hasta ${MAX_HORAS_LINEA_EN_VIVO} horas`);
    }
    const context = getTenantContext();
    const tenant = String(context.tenantId);

    const puestos = await tenantQuery(
      postgresPool,
      `SELECT w.id, w.name, w.code
       FROM workstations w
       WHERE w.tenant_id = $1 AND w.status = 'active'
       ORDER BY w.code`,
      [tenant],
    );

    const partes = await tenantQuery(
      postgresPool,
      `SELECT wb.workstation_id, wb.type, wb.start_time, wb.end_time, wb.downtime_reason,
              wb.produced_quantity, o.code AS order_code, o.quantity AS order_quantity,
              o.produced_quantity AS order_produced, o.status AS order_status
       FROM production_work_blocks wb
       LEFT JOIN orders o ON o.tenant_id = wb.tenant_id AND o.id = wb.order_id
       WHERE wb.tenant_id = $1
         AND wb.start_time < $3 AND wb.end_time > $2
       ORDER BY wb.start_time ASC`,
      [tenant, rango.startDate, rango.endDate],
    );

    const porPuesto = new Map<string, LiveTimelineWorkstation>();
    for (const puesto of puestos.rows) {
      porPuesto.set(puesto.id, {
        workstation_id: puesto.id,
        name: puesto.name,
        code: puesto.code,
        order: null,
        blocks: [],
      });
    }

    for (const parte of partes.rows) {
      const puesto = porPuesto.get(parte.workstation_id);
      if (!puesto) continue;
      puesto.blocks.push({
        type: parte.type,
        start_time: new Date(parte.start_time).toISOString(),
        end_time: new Date(parte.end_time).toISOString(),
        downtime_reason: parte.downtime_reason ?? null,
        produced_quantity: Number(parte.produced_quantity ?? 0),
        order_code: parte.order_code ?? null,
      });
      // La orden del puesto es la del último parte del rango.
      if (parte.order_code != null) {
        puesto.order = {
          code: parte.order_code,
          quantity: Number(parte.order_quantity ?? 0),
          produced_quantity: Number(parte.order_produced ?? 0),
          status: parte.order_status ?? 'in_progress',
        };
      }
    }

    return [...porPuesto.values()];
  }
}

/** Un turno son 8 horas; con margen para pedir un día completo. */
const MAX_HORAS_LINEA_EN_VIVO = 26;

export interface LiveTimelineBlock {
  type: string;
  start_time: string;
  end_time: string;
  downtime_reason: string | null;
  produced_quantity: number;
  order_code: string | null;
}

export interface LiveTimelineOrder {
  code: string;
  quantity: number;
  produced_quantity: number;
  status: string;
}

export interface LiveTimelineWorkstation {
  workstation_id: string;
  name: string;
  code: string;
  order: LiveTimelineOrder | null;
  blocks: LiveTimelineBlock[];
}
