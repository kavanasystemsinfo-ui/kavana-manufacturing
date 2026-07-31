import { Injectable } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';

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
}

export interface DowntimeBreakdown {
  reason: string;
  count: number;
  total_ms: number;
  percentage: number;
}

interface DowntimeRow {
  downtime_reason: string | null;
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
    const context = getTenantContext();

    // Get workstation name
    const wsResult = await postgresPool.query(
      `SELECT name FROM workstations WHERE tenant_id = $1 AND id = $2`,
      [String(context.tenantId), workstationId],
    );
    const wsName = wsResult.rows[0]?.name ?? 'Unknown';

    // Get production blocks
    const blocksResult = await postgresPool.query(
      `SELECT type, start_time, end_time, produced_quantity, defect_quantity, downtime_reason
       FROM production_work_blocks
       WHERE tenant_id = $1 AND workstation_id = $2
         AND start_time >= $3 AND end_time <= $4
       ORDER BY start_time ASC`,
      [String(context.tenantId), workstationId, startDate, endDate],
    );

    const blocks = blocksResult.rows;

    // Calculate totals
    let totalProductionMs = 0;
    let totalDowntimeMs = 0;
    let totalProduced = 0;
    let totalDefects = 0;

    for (const block of blocks) {
      const duration = new Date(block.end_time).getTime() - new Date(block.start_time).getTime();
      if (block.type === 'produccion') {
        totalProductionMs += duration;
        totalProduced += Number(block.produced_quantity ?? 0);
        totalDefects += Number(block.defect_quantity ?? 0);
      } else {
        totalDowntimeMs += duration;
      }
    }

    const totalPlannedMs = totalProductionMs + totalDowntimeMs;

    // Availability = production time / planned time
    const availability = totalPlannedMs > 0 ? totalProductionMs / totalPlannedMs : 0;

    // Get target rate for performance calculation
    const modelResult = await postgresPool.query(
      `SELECT mm.target_rate
       FROM orders po
       JOIN manufacturing_models mm ON po.tenant_id = mm.tenant_id AND po.code = mm.name
       WHERE po.tenant_id = $1 AND po.workstation_id = $2
       LIMIT 1`,
      [String(context.tenantId), workstationId],
    );
    const targetRate = Number(modelResult.rows[0]?.target_rate ?? 0);

    // Performance = actual output rate / target rate
    const actualRateMs = totalProductionMs > 0 ? totalProduced / (totalProductionMs / 3600000) : 0;
    const performance = targetRate > 0 ? Math.min(actualRateMs / targetRate, 1) : 0;

    // Quality = good parts / total parts
    const quality = totalProduced > 0 ? (totalProduced - totalDefects) / totalProduced : 0;

    // OEE = Availability × Performance × Quality
    const oee = availability * performance * quality;

    return {
      workstation_id: workstationId,
      workstation_name: wsName,
      availability: Math.round(availability * 10000) / 100,
      performance: Math.round(performance * 10000) / 100,
      quality: Math.round(quality * 10000) / 100,
      oee: Math.round(oee * 10000) / 100,
      total_production_time_ms: totalProductionMs,
      total_downtime_ms: totalDowntimeMs,
      total_produced: totalProduced,
      total_defects: totalDefects,
      period_start: startDate,
      period_end: endDate,
    };
  }

  async getOeeByWorkstation(
    startDate: string,
    endDate: string,
  ): Promise<OeeByWorkstation[]> {
    const context = getTenantContext();

    const result = await postgresPool.query(
      `SELECT w.id, w.name
       FROM workstations w
       WHERE w.tenant_id = $1 AND w.status = 'active'
       ORDER BY w.name`,
      [String(context.tenantId)],
    );

    const summaries: OeeByWorkstation[] = [];
    for (const ws of result.rows) {
      const summary = await this.getOeeSummary(ws.id, startDate, endDate);
      summaries.push({
        workstation_id: ws.id,
        workstation_name: ws.name,
        oee: summary.oee,
        availability: summary.availability,
        performance: summary.performance,
        quality: summary.quality,
      });
    }

    return summaries;
  }

  async getDowntimeBreakdown(
    workstationId: string,
    startDate: string,
    endDate: string,
  ): Promise<DowntimeBreakdown[]> {
    const context = getTenantContext();

    const result = await postgresPool.query(
      `SELECT downtime_reason, COUNT(*) as count,
              SUM(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)::bigint as total_ms
       FROM production_work_blocks
       WHERE tenant_id = $1 AND workstation_id = $2
         AND type = 'parada'
         AND start_time >= $3 AND end_time <= $4
         AND downtime_reason IS NOT NULL
       GROUP BY downtime_reason
       ORDER BY total_ms DESC`,
      [String(context.tenantId), workstationId, startDate, endDate],
    );

    const totalDowntimeMs = result.rows.reduce(
      (sum: number, row: DowntimeRow) => sum + Number(row.total_ms),
      0,
    );

    return result.rows.map((row: DowntimeRow) => ({
      reason: row.downtime_reason ?? row.reason,
      count: Number(row.count),
      total_ms: Number(row.total_ms),
      percentage:
        totalDowntimeMs > 0
          ? Math.round((Number(row.total_ms) / totalDowntimeMs) * 10000) / 100
          : 0,
    }));
  }
}
