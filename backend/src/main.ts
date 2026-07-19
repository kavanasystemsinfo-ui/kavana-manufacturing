import 'dotenv/config';
import 'reflect-metadata';
import { initOtelSDK } from './telemetry/sdk.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ZodFilter } from './zod.filter.js';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  // ── Telemetría ANTES de NestJS ──
  const otelSdk = await initOtelSDK();

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' });
  app.useGlobalFilters(new ZodFilter());

  const errorFilter: ExceptionFilter = {
    catch(exception: unknown, host: ArgumentsHost) {
      console.error('[BACKEND_ERROR]', exception);
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const message = exception instanceof Error ? exception.message : String(exception);
      response.status(500).json({ statusCode: 500, message });
    },
  };
  app.useGlobalFilters(errorFilter);

  await app.listen(Number(process.env.PORT ?? 3001));

  // ── Graceful shutdown ──
  const graceful = async () => {
    await app.close();
    if (otelSdk) await otelSdk.shutdown();
    process.exit(0);
  };
  process.on('SIGTERM', graceful);
  process.on('SIGINT', graceful);
}

void bootstrap();
