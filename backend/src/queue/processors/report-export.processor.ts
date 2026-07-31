import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { postgresPool } from '../../db/postgres.provider.js';

interface ReportExportJob {
  tenantId: string;
  reportType: 'oee' | 'quality' | 'production' | 'costs';
  format: 'csv' | 'pdf' | 'json';
  userId: string;
}

@Processor('report-export')
export class ReportExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportExportProcessor.name);

  async process(job: Job<ReportExportJob>): Promise<{ exported: number; rows: number }> {
    const { tenantId, reportType, format } = job.data;

    this.logger.log(`Exportando reporte: ${reportType}/${format}, tenant=${tenantId}`);

    const pool = postgresPool;
    const client = await pool.connect();

    try {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);

      let query = '';
      switch (reportType) {
        case 'oee':
          query = `SELECT * FROM oee_metrics WHERE tenant_id = $1 ORDER BY period_start DESC LIMIT 1000`;
          break;
        case 'quality':
          query = `SELECT qc.*, o.code as order_code FROM quality_checks qc JOIN orders o ON o.id = qc.order_id WHERE qc.tenant_id = $1 ORDER BY qc.created_at DESC LIMIT 1000`;
          break;
        case 'production':
          query = `SELECT wb.*, ws.name as ws_name, o.code as order_code FROM production_work_blocks wb JOIN workstations ws ON ws.id = wb.workstation_id JOIN orders o ON o.id = wb.order_id WHERE wb.tenant_id = $1 ORDER BY wb.start_time DESC LIMIT 1000`;
          break;
        case 'costs':
          query = `SELECT * FROM cost_records WHERE tenant_id = $1 ORDER BY recorded_at DESC LIMIT 1000`;
          break;
      }

      const result = await client.query(query, [tenantId]);
      const rows = result.rowCount || 0;

      if (format === 'json') {
        const json = JSON.stringify(result.rows, null, 2);
        // En producción: guardar en S3/GCS, notificar al usuario
        this.logger.log(`Reporte JSON generado: ${reportType}, ${rows} filas, ${json.length} bytes`);
      } else {
        this.logger.log(`Reporte ${format.toUpperCase()} simulado: ${reportType}, ${rows} filas`);
      }

      return { exported: 1, rows };

    } finally {
      client.release();
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Report export completed: job ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Report export failed: job ${job.id} — ${err.message}`);
  }
}
