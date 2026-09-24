import { Module } from '@nestjs/common';
import { ApiDocsController } from './api-docs.controller.js';

/** Spec OpenAPI pública (tarea 3.4): sirve /api-docs/docs y /api-docs/docs.json. */
@Module({
  controllers: [ApiDocsController],
})
export class OpenApiModule {}
