import { Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

/**
 * Global exception filter that:
 * - Leaves HttpException (and subclasses) with their original status and body.
 * - Logs unexpected errors with tenant context (if available) and returns 500 with a generic message.
 * - Ensures all error responses follow the shape: { statusCode: number, message?: any, error?: string }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // If it's an HttpException (including ValidationException, etc.), keep its status and response.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : body,
      );
      return;
    }

    // For everything else, treat as unexpected server error.
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    console.error('[GLOBAL_ERROR] Uncaught exception:', errorMessage);
    // Optionally add tenant ID if available via request headers or custom property.
    const tenantId =
      request.headers['x-tenant-id'] ?? (request as any).tenantId ?? 'unknown';

    const errorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      tenantId,
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
}