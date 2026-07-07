import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { tenantContextStorage } from './tenant-context.storage.js';
import { JwtServiceWrapper } from './jwt.service.js';

// ponytail: Instantiate directly instead of relying on NestJS DI for middleware.
// Middlewares applied via consumer.apply() have known DI quirks with tsx watch.
const jwtService = new JwtServiceWrapper();

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    try {
      const context = jwtService.verifyBearerToken(request.headers.authorization);

      tenantContextStorage.run(context, () => {
        next();
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unauthorized';
      response.status(401).json({ statusCode: 401, message: msg });
    }
  }
}

