import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that redirects requests from /api/* to /api/v1/*,
 * adding a deprecation warning header.
 * Requests already under /api/v1/* are passed through.
 */
@Injectable()
export class ApiVersioningMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
    // If path starts with /api/ but not /api/v1/, redirect.
    if (path.startsWith('/api/') && !path.startsWith('/api/v1/')) {
      const newPath = '/api/v1' + path.substring(5); // remove '/api' and prepend '/api/v1'
      // Preserve query string
      const queryString = req.url.substring(path.length);
      const redirectUrl = newPath + queryString;
      // Set a header to inform clients
      res.setHeader('Deprecation', 'true');
      res.setHeader('Warning', '299 - "API version deprecated. Use /api/v1/ instead."');
      // Optionally, you could redirect with 301, but we choose to forward internally.
      // For simplicity, we rewrite the request URL and let the router handle it.
      req.url = redirectUrl;
    }
    next();
  }
}