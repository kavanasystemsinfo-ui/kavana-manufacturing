import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that adds a Warning header to requests under /api/* (excluding /api/v1/*)
 * to indicate that the endpoint is deprecated and clients should migrate to /api/v1/.
 */
@Injectable()
export class ApiDeprecationWarningMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
    // If path starts with /api/ but not /api/v1/, add a deprecation warning.
    if (path.startsWith('/api/') && !path.startsWith('/api/v1/')) {
      // Warning header format: Warning: <code> <host> "<message>" <date>
      // We'll use a simple custom format or standard: 299 - "Deprecated API endpoint. Use /api/v1/ instead."
      res.setHeader('Warning', '299 - "Deprecated API endpoint. Use /api/v1/ instead."');
    }
    next();
  }
}