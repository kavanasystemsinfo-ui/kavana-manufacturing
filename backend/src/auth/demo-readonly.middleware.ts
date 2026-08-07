import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { getTenantContext } from './tenant-context.storage.js';

// Blindaje de la DEMO (2026-08-07): el reclutador entra con las cuentas
// públicas (admin/supervisor/operario del tenant demo) y NO debe poder
// manipular los datos existentes del histórico (90 días) ni el catálogo.
// Se bloquean métodos destructivos (DELETE, PUT, PATCH) sobre el tenant demo
// (id=1). La creación (POST) SÍ se permite: lo que cree el visitante caduca a
// las 24h con la regeneración diaria (simulate-daily). Empresas reales (tenant
// != 1) no se ven afectadas.
const DEMO_TENANT_ID = 1n;
const BLOCKED_METHODS = new Set(['DELETE', 'PUT', 'PATCH']);

@Injectable()
export class DemoReadOnlyMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    try {
      const context = getTenantContext();
      if (
        context.tenantId === DEMO_TENANT_ID &&
        BLOCKED_METHODS.has(request.method)
      ) {
        response.status(403).json({
          statusCode: 403,
          message:
            'Demo de solo lectura: los datos existentes no se pueden modificar ni borrar. Crea datos nuevos (caducan a las 24h).',
        });
        return;
      }
    } catch {
      // Sin contexto de tenant: dejar pasar (rutas públicas como health)
    }
    next();
  }
}
