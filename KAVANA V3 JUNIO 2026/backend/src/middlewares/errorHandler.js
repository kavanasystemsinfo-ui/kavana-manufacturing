import { logger } from '../utils/logger.js';

export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    logger.error({ error, req }, 'Unhandled server error');
  } else {
    logger.warn({ error, req }, 'Operational error');
  }

  res.status(statusCode).json({
    message: statusCode >= 500 ? 'Internal server error' : error.message,
    code,
    ...(error.details ? { details: error.details } : {})
  });
}
