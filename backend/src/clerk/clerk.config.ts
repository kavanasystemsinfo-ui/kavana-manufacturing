import { registerAs } from '@nestjs/config';

export interface ClerkConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  apiUrl: string;
}

export default registerAs('clerk', (): ClerkConfig => ({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  secretKey: process.env.CLERK_SECRET_KEY || '',
  webhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
  apiUrl: process.env.CLERK_API_URL || 'https://api.clerk.com/v1',
}));