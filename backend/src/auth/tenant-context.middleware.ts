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
      // El asistente IA del LOGIN (demo pública) funciona sin token: usa el
      // tenant demo (1) por defecto. El resto de rutas exigen auth.
      // (originalUrl cubre el caso de proxy que añada prefijo base)
      const fullPath = `${request.originalUrl ?? request.path ?? ''}`;
      const isAdvisorRoute = fullPath.includes('/ai-advisor');
      if (isAdvisorRoute) {
        tenantContextStorage.run(
          { tenantId: 1n, userId: 'demo-visitor', role: 'tenant_admin' },
          () => {
            next();
          },
        );
        return;
      }
      const msg = error instanceof Error ? error.message : 'Unauthorized';
      response.status(401).json({ statusCode: 401, message: msg });
    }
  }
}

