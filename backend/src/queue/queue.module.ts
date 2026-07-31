import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service.js';
import { OeeRecalcProcessor } from './processors/oee-recalc.processor.js';
import { ReportExportProcessor } from './processors/report-export.processor.js';
import { DocumentIngestProcessor } from './processors/document-ingest.processor.js';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: redisHost, port: redisPort },
      defaultJobOptions: {
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
    BullModule.registerQueue(
      { name: 'oee-recalc' },
      { name: 'report-export' },
      { name: 'document-ingest' },
    ),
  ],
  providers: [QueueService, OeeRecalcProcessor, ReportExportProcessor, DocumentIngestProcessor],
  exports: [QueueService],
})
export class QueueModule {}
