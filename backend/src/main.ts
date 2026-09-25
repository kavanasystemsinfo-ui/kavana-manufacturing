import 'dotenv/config';
import 'reflect-metadata';
import { initOtelSDK } from './telemetry/sdk.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { ApiDeprecationWarningMiddleware } from './common/middleware/deprecation.middleware.js';
import { ApiVersioningMiddleware } from './common/middleware/versioning.middleware.js';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  // ── Telemetría ANTES de NestJS ──
  const otel = await initOtelSDK();

  const app = await NestFactory.create(AppModule);
  // Migración 3.2: prefijo global api/v1 activado. El middleware de versionado
  // reescribe /api/* → /api/v1/* para compatibilidad con clientes legacy.
  app.setGlobalPrefix('api/v1');
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
  app.useGlobalFilters(new GlobalExceptionFilter());
  // Express solo acepta funciones en app.use(): pasar la instancia de clase
  // (new ApiDeprecationWarningMiddleware()) mata el arranque con
  // "TypeError: app.use() requires a middleware function" y Render mantiene la
  // versión anterior en vivo. Se registra el método ya ligado a la instancia.
  const versionado = new ApiVersioningMiddleware();
  app.use(versionado.use.bind(versionado));
  const avisoDeprecacion = new ApiDeprecationWarningMiddleware();
  app.use(avisoDeprecacion.use.bind(avisoDeprecacion));

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