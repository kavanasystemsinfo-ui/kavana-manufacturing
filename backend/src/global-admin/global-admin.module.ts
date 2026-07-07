import { Module } from '@nestjs/common';
import { GlobalAdminService } from './global-admin.service.js';
import { GlobalAdminController } from './global-admin.controller.js';

@Module({
  controllers: [GlobalAdminController],
  providers: [GlobalAdminService],
  exports: [GlobalAdminService],
})
export class GlobalAdminModule {}
