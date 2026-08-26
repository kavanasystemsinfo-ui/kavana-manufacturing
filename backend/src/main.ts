import 'dotenv/config';
import 'reflect-metadata';
import { initOtelSDK } from './telemetry/sdk.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ZodFilter } from './zod.filter.js';
import { HttpException } from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  // ── Telemetría ANTES de NestJS ──
  const otel = await initOtelSDK();

  const app = await NestFactory.create(AppModule);
  const frontendOrigen = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // Permitir requests sin Origin (curl, Postman, server-to-server)
      if (!origin) return cb(null, true);
      const permitidos = frontendOrigen.split(',').map((o) => o.trim()).concat('https://www.kavanasystems.com');
      if (permitidos.includes(origin)) return cb(null, true);
      return cb(new Error('Origen no permitido por CORS'));
    },
  });
  app.useGlobalFilters(new ZodFilter());

  const errorFilter: ExceptionFilter = {
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();

      // Las excepciones HTTP de Nest (400/401/403/404/409/410...) deben salir
      // con su status real, no convertidas en 500. Antes este filtro lo pisaba
      // todo: BadRequestException("...") se devolvía como 500.
      if (exception instanceof HttpException) {
        const status = exception.getStatus();
        const body = exception.getResponse();
        response
          .status(status)
          .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
        return;
      }

      console.error('[BACKEND_ERROR]', exception);
      const message = exception instanceof Error ? exception.message : String(exception);
      response.status(500).json({ statusCode: 500, message });
    },
  };
  app.useGlobalFilters(errorFilter);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`[backend] Kavana Manufacturing API en :${port}`);
  if (otel.mode !== 'off') {
    console.log(`[backend] Telemetría: ${otel.mode}`);
  }

  // ── Graceful shutdown ──
  const graceful = async () => {
    await app.close();
    if (otel.sdk) await otel.sdk.shutdown();
    process.exit(0);
  };
  process.on('SIGTERM', graceful);
  process.on('SIGINT', graceful);
}

void bootstrap();
