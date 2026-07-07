import { Module } from '@nestjs/common';
import { OeeController } from './oee.controller.js';
import { OeeService } from './oee.service.js';

@Module({
  controllers: [OeeController],
  providers: [OeeService],
})
export class OeeModule {}
