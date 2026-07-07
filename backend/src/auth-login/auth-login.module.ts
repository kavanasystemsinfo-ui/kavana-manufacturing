import { Module } from '@nestjs/common';
import { AuthLoginService } from './auth-login.service.js';
import { AuthLoginController } from './auth-login.controller.js';

@Module({
  controllers: [AuthLoginController],
  providers: [AuthLoginService],
  exports: [AuthLoginService],
})
export class AuthLoginModule {}
