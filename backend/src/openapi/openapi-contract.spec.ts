import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodSchema } from 'zod';
import { buildOpenApiDocument } from './build-openapi-document.js';
import { BODY_SCHEMAS } from './body-schemas.js';

import { AiAdvisorController } from '../ai-advisor/ai-advisor.controller.js';
import { AuthLoginController } from '../auth-login/auth-login.controller.js';
import { CoreMesProductionController } from '../core-mes-production/core-mes-production.controller.js';
import { CostController } from '../cost/cost.controller.js';
import { GlobalAdminController } from '../global-admin/global-admin.controller.js';
import { HealthController } from '../health/health.controller.js';
import { IncidenciasController } from '../incidencias/incidencias.controller.js';
import { ManufacturingModelsController } from '../manufacturing-models/manufacturing-models.controller.js';
import { MaterialsController } from '../materials/materials.controller.js';
import { OeeController } from '../oee/oee.controller.js';
import { OrdersController } from '../orders/orders.controller.js';
import { QualityController } from '../quality/quality.controller.js';
import { TenantCapabilitiesController } from '../tenant-capabilities/tenant-capabilities.controller.js';
import { ToolingsController } from '../toolings/toolings.controller.js';
import { UsersController } from '../users/users.controller.js';
import { WorkstationsController } from '../workstations/workstations.controller.js';

/**
 * Contract test OpenAPI (tarea 3.4): la spec publicada en /api/docs debe
 * cubrir TODA la superficie HTTP real del backend, leída de los metadatos de
 * Nest (no de un listado a mano que caduca al primer controller nuevo).
 *
 * La fuente de verdad de los bodies es el zod que cada endpoint valida de
 * verdad al ejecutarse (BODY_SCHEMAS). materials no valida (hallazgo de esta
 * auditoría: POST/PATCH con `data: any`), así que allí la spec declara el
 * contrato observado del frontend y queda pendiente su zod.
 */

const reflector = new Reflector();

type ClaseControlador = { prototype: object };

const CONTROLLERS: ReadonlyArray<readonly [string, ClaseControlador]> = [
  ['ai-advisor', AiAdvisorController],
  ['auth', AuthLoginController],
  ['core-mes-production', CoreMesProductionController],
  ['costs', CostController],
  ['global-admin', GlobalAdminController],
  ['health', HealthController],
  ['incidencias', IncidenciasController],
  ['manufacturing-models', ManufacturingModelsController],
  ['materials', MaterialsController],
  ['oee', OeeController],
  ['orders', OrdersController],
  ['quality', QualityController],
  ['tenant-capabilities', TenantCapabilitiesController],
  ['toolings', ToolingsController],
  ['users', UsersController],
  ['workstations', WorkstationsController],
];

interface RutaReal {
  method: string;
  path: string;
  controller: string;
  handler: string;
}

/** RequestMethod de Nest es numérico (0=GET…4=PATCH), no un string. */
const METHOD_NAMES: Readonly<Record<number, 'get' | 'post' | 'put' | 'delete' | 'patch'>> = {
  0: 'get',
  1: 'post',
  2: 'put',
  3: 'delete',
  4: 'patch',
};

/** Enumera cada endpoint con su path y verbo, leyendo la metadata de Nest. */
function endpointsReales(): RutaReal[] {
  const rutas: RutaReal[] = [];
  for (const [nombre, controller] of CONTROLLERS) {
    const prototype = controller.prototype as unknown as Record<string, unknown>;
    for (const metodo of Object.getOwnPropertyNames(prototype)) {
      if (metodo === 'constructor') continue;
      const handler = prototype[metodo] as object | undefined;
      if (!handler || typeof handler !== 'function') continue;
      const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      if (path === undefined) continue;
      const verbNum = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
      const verb = verbNum !== undefined ? METHOD_NAMES[verbNum] : undefined;
      if (!verb) continue;
      const prefijo = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '');
      const relativa = path === '/' ? '' : `/${path}`;
      rutas.push({
        method: verb,
        path: `/${prefijo}${relativa}`,
        controller: nombre,
        handler: metodo,
      });
    }
  }
  return rutas;
}

/** Convierte el path de Express (:id) al formato de OpenAPI ({id}). */
function pathOpenApi(path: string): string {
  return path.replace(/:(\w+)/g, '{$1}');
}

describe('Spec OpenAPI', () => {
  it('la API tiene superficie suficiente para que este test pruebe algo', () => {
    expect(endpointsReales().length).toBeGreaterThan(60);
  });

  it('es un documento OpenAPI 3 válido en lo estructural: openapi, info y paths', () => {
    const doc = buildOpenApiDocument();
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.info.title).toBeTruthy();
    expect(doc.info.version).toBeTruthy();
    expect(Object.keys(doc.paths).length).toBeGreaterThan(60);
  });

  it('declara operationId único para cada operación', () => {
    const doc = buildOpenApiDocument();
    const ids = Object.values(doc.paths).flatMap((pathItem) =>
      Object.values(pathItem).map((op) => (op as { operationId?: string }).operationId),
    );
    const sinId = ids.filter((id) => !id);
    expect(sinId).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(endpointsReales())('$controller $method $path está cubierto en la spec', (ruta) => {
    const doc = buildOpenApiDocument();
    const item = doc.paths[pathOpenApi(ruta.path)];
    expect(item, `${ruta.controller}.${ruta.handler}`).toBeDefined();
    const op = (item as Record<string, unknown>)[ruta.method] as { summary?: string } | undefined;
    expect(op, `${ruta.method} ${ruta.path}`).toBeDefined();
    expect(op?.summary).toBeTruthy();
  });

  it('cada endpoint con body zod publica ese schema y coinciden', () => {
    const doc = buildOpenApiDocument();
    for (const [ruta, schema] of BODY_SCHEMAS) {
      const [verbRaw, ...restoPath] = ruta.split(' ');
      const verb = verbRaw.toLowerCase();
      const path = restoPath.join(' ');
      // La ruta raíz de Nest es "/", que aquí se normaliza a sin sufijo.
      const normalizada = path.replace(/\/$/, '');
      const item = doc.paths[pathOpenApi(normalizada)] as Record<string, unknown> | undefined;
      const op = (item?.[verb] ?? {}) as {
        requestBody?: { content: Record<string, { schema?: object }> };
      };
      expect(item, `falta ${ruta} en la spec`).toBeDefined();
      const publicado = op.requestBody?.content['application/json']?.schema;
      expect(publicado, `falta requestBody en ${ruta}`).toBeDefined();
      // El schema publicado tiene que ser equivalente al zod real del endpoint.
      const esperado = zodToJsonSchema(schema as ZodSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      });
      expect(publicado).toEqual(esperado);
    }
  });

  it('el índice de bodies cubre endpoints con cuerpo que existen', () => {
    const doc = buildOpenApiDocument();
    const reales = new Set(
      endpointsReales().map((r) => `${r.method.toUpperCase()} ${r.path.replace(/\/$/, '')}`),
    );
    for (const [ruta] of BODY_SCHEMAS) {
      const [method, ...restoPath] = ruta.split(' ');
      const path = restoPath.join(' ');
      expect(reales, `${ruta} no existe en la API`).toContain(`${method} ${path.replace(/\/$/, '')}`);
      expect(doc.paths[pathOpenApi(path)], `${ruta} no está en la spec`).toBeDefined();
    }
  });

  it('las rutas públicas del guard constan como sin autenticación', () => {
    const doc = buildOpenApiDocument();
    // health y auth/login son públicas por diseño (PUBLIC_ROUTES del guard).
    const health = doc.paths['/health']?.get as { security?: unknown[] } | undefined;
    expect(health?.security).toEqual([]);
    const login = doc.paths['/auth/login']?.post as { security?: unknown[] } | undefined;
    expect(login?.security).toEqual([]);
  });
});
