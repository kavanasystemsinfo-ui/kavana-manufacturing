import { Module, Global, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

const redisHost = process.env.REDIS_HOST;
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD;
const hasRedis = !!redisHost;
// FIX A2 (2026-08-21): si hay Redis configurado, exigir password (fail-fast
// en producción; warn en dev para no romper entornos locales sin Redis real).
if (hasRedis && !redisPassword && process.env.NODE_ENV === 'production') {
  throw new Error('REDIS_PASSWORD is required when REDIS_HOST is set (production)');
}
if (hasRedis && !redisPassword) {
  console.warn('⚠ REDIS_PASSWORD not set — connecting without auth (dev only)');
}

@Global()
@Module({
  imports: hasRedis
    ? [
        BullModule.forRoot({
          connection: { host: redisHost, port: redisPort, ...(redisPassword ? { password: redisPassword } : {}) },
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
      ]
    : [],
  providers: [],
  exports: [],
})
export class QueueModule {
  private readonly logger = new Logger(QueueModule.name);

  constructor() {
    if (hasRedis) {
      this.logger.log(`BullMQ conectado a Redis: ${redisHost}:${redisPort}`);
    } else {
      this.logger.warn('Redis no configurado — colas BullMQ desactivadas (define REDIS_HOST para activarlas)');
    }
  }
}
