import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { postgresPool } from '../../db/postgres.provider.js';

interface OeeRecalcJob {
  tenantId: string;
  workstationId?: string;
  periodDays?: number;
}

@Processor('oee-recalc')
export class OeeRecalcProcessor extends WorkerHost {
  private readonly logger = new Logger(OeeRecalcProcessor.name);

  async process(job: Job<OeeRecalcJob>): Promise<{ rows: number }> {
    const { tenantId, workstationId } = job.data;
    const days = job.data.periodDays || 7;

    this.logger.log(`Recalculando OEE: tenant=${tenantId}, ws=${workstationId || 'all'}, period=${days}d`);

    const pool = postgresPool;
    const client = await pool.connect();

    try {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);

      // Limpiar métricas antiguas del periodo y regenerarlas
      const result = await client.query(`
        DELETE FROM oee_metrics
        WHERE tenant_id = $1
          AND period_start >= NOW() - ($2 || ' days')::INTERVAL
        RETURNING id
      `, [tenantId, String(days)]);

      const deleted = result.rowCount || 0;

      // Reinsertar OEE calculado desde work_blocks
      await client.query(`
        INSERT INTO oee_metrics (tenant_id, workstation_id, period_start, period_end,
                                  availability, performance, quality, oee)
        SELECT
          wb.tenant_id,
          wb.workstation_id,
          date_trunc('day', wb.start_time) as period_start,
          date_trunc('day', wb.start_time) + INTERVAL '1 day' as period_end,
          COALESCE(
            SUM(CASE WHEN wb.type = 'production' THEN EXTRACT(EPOCH FROM (wb.end_time - wb.start_time)) ELSE 0 END)
            / NULLIF(SUM(EXTRACT(EPOCH FROM (wb.end_time - wb.start_time))), 0), 0
          ) as availability,
          0.85 as performance,
          COALESCE(
            1.0 - (SUM(wb.defect_quantity)::float / NULLIF(SUM(wb.produced_quantity), 0)),
            1.0
          ) as quality,
          COALESCE(
            (SUM(CASE WHEN wb.type = 'production' THEN EXTRACT(EPOCH FROM (wb.end_time - wb.start_time)) ELSE 0 END)
             / NULLIF(SUM(EXTRACT(EPOCH FROM (wb.end_time - wb.start_time))), 0))
            * 0.85
            * (1.0 - (SUM(wb.defect_quantity)::float / NULLIF(SUM(wb.produced_quantity), 0))),
            0
          ) as oee
        FROM production_work_blocks wb
        WHERE wb.tenant_id = $1
          AND wb.start_time >= NOW() - ($2 || ' days')::INTERVAL
        GROUP BY wb.tenant_id, wb.workstation_id, date_trunc('day', wb.start_time)
      `, [tenantId, String(days)]);

      this.logger.log(`OEE recalc done: deleted=${deleted}, tenant=${tenantId}`);
      return { rows: result.rowCount || 0 };

    } finally {
      client.release();
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`OEE recalc completed: job ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`OEE recalc failed: job ${job.id} — ${err.message}`);
  }
}
