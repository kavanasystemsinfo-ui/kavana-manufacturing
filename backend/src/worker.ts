/**
 * Worker independiente — procesa jobs de BullMQ sin levantar el API HTTP.
 *
 * Uso: REDIS_HOST=localhost npx tsx src/worker.ts
 *
 * Útil para escalar: puedes levantar N workers en paralelo.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { QueueModule } from './queue/queue.module.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(QueueModule);
  console.log(`[worker] BullMQ worker iniciado — Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
  console.log('[worker] Colas: oee-recalc, report-export');
  console.log('[worker] Esperando jobs... (Ctrl+C para salir)');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[worker] Cerrando...');
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void bootstrap();
