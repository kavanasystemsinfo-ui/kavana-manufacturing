import { Module } from '@nestjs/common';
import { OeeController } from './oee.controller.js';
import { OeeService } from './oee.service.js';

@Module({
  controllers: [OeeController],
  providers: [OeeService],
  // El asistente de IA usa la misma cuenta que el panel: si cada uno tuviera la
  // suya, volverían a salir dos números distintos del mismo puesto.
  exports: [OeeService],
})
export class OeeModule {}
