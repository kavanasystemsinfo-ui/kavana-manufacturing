import { Module } from '@nestjs/common';
import { IncidenciasController } from './incidencias.controller.js';
import { IncidenciasService } from './incidencias.service.js';
import { IncidenciaUploadsService } from './incidencia-uploads.service.js';

@Module({
  controllers: [IncidenciasController],
  providers: [IncidenciasService, IncidenciaUploadsService],
  exports: [IncidenciasService],
})
export class IncidenciasModule {}
