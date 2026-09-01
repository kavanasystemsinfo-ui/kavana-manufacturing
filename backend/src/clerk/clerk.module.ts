import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import clerkConfig from './clerk.config.js';
import { ClerkService } from './clerk.service.js';

@Global()
@Module({
  imports: [ConfigModule.forFeature(clerkConfig)],
  providers: [ClerkService],
  exports: [ClerkService],
})
export class ClerkModule {}