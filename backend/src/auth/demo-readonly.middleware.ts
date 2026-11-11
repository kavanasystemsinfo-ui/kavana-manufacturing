import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { getTenantContext } from './tenant-context.storage.js';

// Blindaje de la DEMO (2026-08-07; alcance revisado 2026-09-29 por decisión de
// Jorge): el visitante entra con las cuentas públicas del tenant demo y NO debe
// poder destruir el histórico (90 días) ni el catálogo. Reglas:
//   - DELETE: bloqueado en todo el tenant demo (órdenes, incidencias, catálogos).
//   - PUT/PATCH: permitido SOLO en el cambio de estado de una orden o de una
//     incidencia, que es el gesto estrella de los paneles (arrastrar la tarjeta
//     de una columna a otra). El resto de ediciones sigue bloqueado: un visitante
//     no renombra puestos, ni cambia usuarios, ni toca utillajes o materiales.
//   - POST: permitido. Lo que crea el visitante caduca a las 24h con la
//     regeneración diaria (simulate-daily).
// Un movimiento de estado sí queda guardado, así que el visitante siguiente ve
// la fábrica en el punto donde la dejó el anterior. Se asume: es una demo, y lo
// que se rompe por no poder mover nada es la demostración entera.
// Empresas reales (tenant != 1 && tenant != 100) no se ven afectadas.
// Cuentas propias (2026-11-11, decisión de Jorge): los ids de usuario listados en
// DEMO_OWNER_USER_IDS (separados por comas) quedan fuera del blindaje y pueden
// borrar y editar en la demo. Fail-closed: sin la variable, nadie queda exento.
// Esas cuentas solo se obtienen entrando con usuario y contraseña, nunca con los
// botones públicos de la demo (que van con otros usuarios).
const DEMO_TENANT_IDS = new Set([1n, 100n]);

function esCuentaPropia(userId: string): boolean {
  return (process.env.DEMO_OWNER_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}
const BLOCKED_METHODS = new Set(['DELETE']);
const STATE_CHANGE_METHODS = new Set(['PUT', 'PATCH']);
const STATE_CHANGE_PATHS = /\/(orders|incidencias)\/[0-9a-fA-F-]{36}\/?$/;

@Injectable()
export class DemoReadOnlyMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    try {
      const context = getTenantContext();
      if (
        DEMO_TENANT_IDS.has(context.tenantId) &&
        !esCuentaPropia(context.userId) &&
        this.isBlocked(request)
      ) {
        response.status(403).json({
          statusCode: 403,
          message:
            'Demo de solo lectura: el histórico no se puede borrar ni el catálogo modificar. Sí puedes mover órdenes e incidencias; lo que crees caduca a las 24h.',
        });
        return;
      }
    } catch {
      // Sin contexto de tenant: dejar pasar (rutas públicas como health)
    }
    next();
  }

  private isBlocked(request: Request): boolean {
    const method = request.method.toUpperCase();
    if (BLOCKED_METHODS.has(method)) {
      return true;
    }
    if (!STATE_CHANGE_METHODS.has(method)) {
      return false;
    }
    const path = (request.originalUrl ?? request.url ?? '').split('?')[0];
    return !STATE_CHANGE_PATHS.test(path);
  }
}
