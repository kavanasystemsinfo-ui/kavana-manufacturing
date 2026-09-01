import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClerkService } from './clerk.service.js';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/clerk-sdk-node';

export interface ClerkAuthPayload {
  sub: string;
  sid: string;
  org_id?: string;
  org_role?: string;
  org_slug?: string;
  org_name?: string;
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      clerkAuth?: ClerkAuthPayload;
      clerkUserId?: string;
      clerkSessionId?: string;
      clerkOrgId?: string;
      clerkOrgRole?: string;
      companyId?: string;
    }
  }
}

@Injectable()
export class ClerkAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ClerkAuthMiddleware.name);

  constructor(
    private readonly clerkService: ClerkService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      // No auth header, continue without Clerk auth
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token with Clerk
      const payload = await verifyToken(token, {
        secretKey: this.configService.get<string>('clerk.secretKey'),
        issuer: `https://${this.configService.get<string>('clerk.publishableKey')?.split('_')[1]?.toLowerCase()}.clerk.accounts.dev`,
      } as any);

      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }

      // Attach Clerk auth info to request
      req.clerkAuth = payload as ClerkAuthPayload;
      req.clerkUserId = payload.sub as string;
      req.clerkSessionId = payload.sid as string;
      req.clerkOrgId = payload.org_id as string | undefined;
      req.clerkOrgRole = payload.org_role as string | undefined;

      // Extract companyId from org_id (Clerk organization = company in our domain)
      if (payload.org_id) {
        req.companyId = payload.org_id;
      }

      this.logger.debug(`Clerk auth verified for user: ${payload.sub}, org: ${payload.org_id}`);
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Clerk auth failed: ${message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}