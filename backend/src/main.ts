import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ZodFilter } from './zod.filter.js';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';

async function bootstrap(): Promise<void> {
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
}

void bootstrap();
