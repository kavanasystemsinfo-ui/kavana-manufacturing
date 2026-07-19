import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface OeeRecalcJob {
  tenantId: string;
  workstationId?: string;
  periodDays?: number;
}

export interface ReportExportJob {
  tenantId: string;
  reportType: 'oee' | 'quality' | 'production' | 'costs';
  format: 'csv' | 'pdf' | 'json';
  userId: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('oee-recalc') private readonly oeeRecalcQueue: Queue<OeeRecalcJob>,
    @InjectQueue('report-export') private readonly reportExportQueue: Queue<ReportExportJob>,
  ) {}

  /** Encola un recálculo de OEE asíncrono */
  async enqueueOeeRecalc(job: OeeRecalcJob): Promise<string> {
    const j = await this.oeeRecalcQueue.add('recalc-oee', job, {
      jobId: `oee-${job.tenantId}-${job.workstationId || 'all'}-${Date.now()}`,
    });
    this.logger.log(`OEE recalc enqueued: ${j.id} (tenant=${job.tenantId})`);
    return j.id!;
  }

  /** Encola una exportación de informe asíncrona */
  async enqueueReportExport(job: ReportExportJob): Promise<string> {
    const j = await this.reportExportQueue.add('export-report', job, {
      jobId: `report-${job.tenantId}-${job.reportType}-${Date.now()}`,
    });
    this.logger.log(`Report export enqueued: ${j.id} (${job.reportType}/${job.format})`);
    return j.id!;
  }
}
