import { Reflector } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
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
 * Documento OpenAPI derivado de los METADATOS de Nest: cada endpoint que
 * existe en el código aparece en la spec, y el contract test de
 * openapi-contract.spec.ts obliga a que siga siendo así (un controller nuevo
 * sin cobertura rompe el CI).
 *
 * Elección deliberada: sin @nestjs/swagger. Los DTOs de este backend son zod
 * (no class-validator), así que DocumentBuilder generaría schemas vacíos;
 * los bodies se publican desde el zod real que cada endpoint valida
 * (BODY_SCHEMAS), la única fuente que no puede mentir.
 *
 * materials no valida su entrada (`data: any`): su contrato se declara
 * literal aquí y el ADR-011 deja el zod pendiente como deuda conocida.
 */

interface OpenApiOperation {
  summary: string;
  operationId: string;
  tags: string[];
  security?: unknown[];
  parameters?: { name: string; in: string; required: boolean; schema: { type: string } }[];
  requestBody?: {
    required: boolean;
    content: Record<string, { schema: object }>;
  };
}

interface OpenApiPathItem {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
}

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, OpenApiPathItem>;
  components?: Record<string, unknown>;
}

/** Rutas públicas por diseño (espejo del PUBLIC_ROUTES del guard). */
const RUTAS_PUBLICAS: ReadonlySet<string> = new Set([
  '/auth',
  '/health',
  '/ai-advisor',
  '/incidencias/upload-mobile',
]);

/** Resumen legible de cada operación, por controller y nombre de handler. */
const RESUMENES: Readonly<Record<string, string>> = {
  // auth
  'auth.login': 'Inicia sesión con usuario y contraseña del tenant por defecto',
  'auth.loginByTenant': 'Inicia sesión indicando el tenant por subdominio',
  'auth.getTenant': 'Resuelve el tenant por subdominio (login por QR/enlace)',
  // health
  'health.health': 'Healthcheck del servicio',
  // users
  'users.createUser': 'Crea un usuario del tenant',
  'users.listUsers': 'Lista los usuarios del tenant',
  'users.getUser': 'Devuelve un usuario por id',
  'users.updateUser': 'Modifica un usuario',
  'users.deleteUser': 'Elimina un usuario',
  // workstations
  'workstations.createWorkstation': 'Crea un puesto de trabajo',
  'workstations.listWorkstations': 'Lista los puestos del tenant',
  'workstations.getWorkstation': 'Devuelve un puesto por id',
  'workstations.updateWorkstation': 'Modifica un puesto',
  'workstations.deleteWorkstation': 'Elimina un puesto',
  // manufacturing-models
  'manufacturing-models.createModel': 'Crea un modelo de fabricación',
  'manufacturing-models.listModels': 'Lista los modelos del tenant',
  'manufacturing-models.getModel': 'Devuelve un modelo por id',
  'manufacturing-models.updateModel': 'Modifica un modelo',
  'manufacturing-models.deleteModel': 'Elimina un modelo',
  // orders
  'orders.createOrder': 'Crea una orden de producción',
  'orders.listOrders': 'Lista las órdenes del tenant',
  'orders.listAvailableOrders': 'Órdenes disponibles para el operario autenticado',
  'orders.getWorkstationsStatus': 'Estado por puesto con su último bloque',
  'orders.getOrder': 'Devuelve una orden por id',
  'orders.getOrderActivity': 'Actividad de una orden',
  'orders.updateOrder': 'Modifica una orden',
  'orders.deleteOrder': 'Elimina una orden',
  // production (core-mes)
  'core-mes-production.listOrders': 'Lista órdenes del módulo core MES',
  'core-mes-production.getOperatorContext': 'Contexto del operario (puesto asignado)',
  'core-mes-production.createOrder': 'Crea una orden del core MES',
  'core-mes-production.getOrder': 'Devuelve una orden por id',
  'core-mes-production.transitionOrder': 'Transiciona el estado de una orden',
  'core-mes-production.syncWorkBlock': 'Sincroniza un bloque de trabajo (offline-first)',
  'core-mes-production.listMyTimeLogs': 'Bloques del operario en un rango (tope 31 días)',
  'core-mes-production.listOrderLogs': 'Registros de una orden',
  'core-mes-production.updateCustomFields': 'Actualiza los custom fields de una orden',
  // toolings
  'toolings.list': 'Lista el utillaje del tenant',
  'toolings.alerts': 'Utillaje cerca o pasado de su vida útil',
  'toolings.getById': 'Devuelve un utillaje por id',
  'toolings.create': 'Crea un utillaje',
  'toolings.update': 'Modifica un utillaje',
  'toolings.delete': 'Elimina un utillaje',
  'toolings.incrementCycles': 'Suma ciclos al utillaje',
  'toolings.incrementByPieces': 'Suma ciclos calculados por piezas',
  'toolings.getByWorkstation': 'Utillaje asignado a un puesto',
  // materials
  'materials.list': 'Lista las materias primas del tenant',
  'materials.create': 'Crea una materia prima (sin validación zod aún)',
  'materials.update': 'Modifica una materia prima',
  'materials.delete': 'Elimina una materia prima',
  'materials.getBom': 'BOM de un modelo',
  'materials.getAllBom': 'BOM completo del tenant',
  'materials.upsertBom': 'Crea o actualiza una línea de BOM',
  'materials.deleteBom': 'Elimina una línea de BOM',
  'materials.getByWorkstation': 'Modelos por puesto',
  // tenant capabilities
  'tenant-capabilities.getCapabilities': 'Capacidades del tenant (módulos y cuotas)',
  'tenant-capabilities.toggleModule': 'Activa o desactiva un módulo del tenant',
  'tenant-capabilities.updateCustomFieldsSchema': 'Guarda el esquema de custom fields',
  'tenant-capabilities.getConfigAudit': 'Auditoría de cambios de configuración',
  'tenant-capabilities.getToolingTypes': 'Catálogo de tipos de utillaje',
  'tenant-capabilities.saveToolingTypes': 'Guarda el catálogo de tipos de utillaje',
  // incidencias
  'incidencias.list': 'Lista las incidencias del tenant',
  'incidencias.stats': 'Estadísticas de incidencias',
  'incidencias.createUploadSession': 'Crea una sesión de subida de foto (QR)',
  'incidencias.uploadMobile': 'Subida pública de foto desde el móvil (sessionId)',
  'incidencias.getUploadSession': 'Estado de la sesión de subida',
  'incidencias.getUploadPhoto': 'Bytes de la foto de una sesión',
  'incidencias.getById': 'Devuelve una incidencia por id',
  'incidencias.create': 'Reporta una incidencia',
  'incidencias.update': 'Modifica una incidencia',
  'incidencias.delete': 'Elimina una incidencia',
  // oee
  'oee.getOeeSummary': 'Resumen OEE de un puesto en un rango',
  'oee.getOeeByWorkstation': 'OEE por puesto en un rango',
  'oee.getDowntimeBreakdown': 'Desglose de paradas de un puesto',
  // quality
  'quality.createCheck': 'Registra un control de calidad',
  'quality.listChecks': 'Controles de calidad de una orden',
  'quality.getSummary': 'Resumen de calidad de una orden',
  // costs
  'cost.createEntry': 'Registra un coste de una orden',
  'cost.listEntries': 'Costes registrados de una orden',
  'cost.getSummary': 'Resumen de costes de una orden',
  // global-admin
  'global-admin.listTenants': 'Lista todos los tenants (admin de plataforma)',
  'global-admin.getTenant': 'Devuelve un tenant por id',
  'global-admin.getTenantStats': 'Métricas de un tenant',
  'global-admin.createTenant': 'Crea un tenant con admin (transaccional)',
  'global-admin.updateTenant': 'Modifica un tenant',
  'global-admin.deleteTenant': 'Elimina un tenant',
  'global-admin.toggleModule': 'Activa/desactiva un módulo de un tenant',
  // ai-advisor
  'ai-advisor.ask': 'Asistente de operación (con contexto)',
  'ai-advisor.askTech': 'Asistente técnico (demo pública de la landing)',
  'ai-advisor.getCorpusStats': 'Estadísticas del corpus del asistente',
};

/** Bodies que no salen de un zod de objeto completo: declarados literales. */
const LITERAL_BODIES: Readonly<Record<string, object>> = {
  'POST /toolings/:id/cycles': {
    type: 'object',
    properties: { amount: { type: 'number', minimum: 1 } },
    required: ['amount'],
  },
  'POST /toolings/:id/produce': {
    type: 'object',
    properties: { pieces: { type: 'number', minimum: 1 } },
    required: ['pieces'],
  },
  'PATCH /tenant/capabilities/modules/:moduleKey': {
    type: 'object',
    properties: { enabled: { type: 'boolean' } },
    required: ['enabled'],
  },
  'PATCH /tenant/tooling-types': {
    type: 'object',
    properties: { types: { type: 'array', items: { type: 'string' } } },
    required: ['types'],
  },
  'POST /quality/checks': {
    type: 'object',
    properties: {
      order_id: { type: 'string', format: 'uuid' },
      workstation_id: { type: 'string', format: 'uuid' },
      result: { type: 'string', enum: ['pass', 'fail', 'conditional'] },
      defect_count: { type: 'integer', minimum: 0 },
      defect_type: { type: 'string' },
      notes: { type: 'string' },
    },
    required: ['order_id', 'workstation_id', 'result', 'defect_count'],
  },
  'POST /costs/entries': {
    type: 'object',
    properties: {
      order_id: { type: 'string', format: 'uuid' },
      category: { type: 'string', enum: ['material', 'labor', 'overhead', 'energy'] },
      amount: { type: 'number' },
      currency: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['order_id', 'category', 'amount', 'currency'],
  },
  'POST /auth/login': {
    type: 'object',
    properties: {
      username: { type: 'string' },
      password: { type: 'string' },
    },
    required: ['username', 'password'],
  },
  'POST /auth/login-by-tenant': {
    type: 'object',
    properties: {
      subdomain: { type: 'string' },
      username: { type: 'string' },
      password: { type: 'string' },
    },
    required: ['subdomain', 'username', 'password'],
  },
  // materials: sin zod (data: any). Contrato observado del frontend; el
  // ADR-011 deja pendiente el zod y con él la migración a BODY_SCHEMAS.
  'POST /materials': {
    type: 'object',
    properties: {
      code: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      unit: { type: 'string' },
      unit_cost: { type: 'number' },
      category: { type: 'string' },
      supplier: { type: 'string' },
      min_stock: { type: 'number' },
    },
    required: ['code', 'name', 'unit'],
  },
  'PATCH /materials/:id': {
    type: 'object',
    properties: {
      code: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      unit: { type: 'string' },
      unit_cost: { type: 'number' },
      category: { type: 'string' },
      supplier: { type: 'string' },
      min_stock: { type: 'number' },
      is_active: { type: 'boolean' },
    },
  },
  'POST /materials/bom': {
    type: 'object',
    properties: {
      model_id: { type: 'string', format: 'uuid' },
      material_id: { type: 'string', format: 'uuid' },
      quantity: { type: 'number' },
      waste_percent: { type: 'number' },
      notes: { type: 'string' },
    },
    required: ['model_id', 'material_id', 'quantity'],
  },
  'POST /global-admin/tenants': {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      subdomain: { type: 'string' },
      status: { type: 'string', enum: ['active', 'suspended', 'trial'] },
      modules: { type: 'array', items: { type: 'string' } },
      admin_username: { type: 'string' },
      admin_password: { type: 'string' },
    },
    required: ['id', 'name'],
  },
  'PUT /global-admin/tenants/:id': {
    type: 'object',
    properties: {
      name: { type: 'string' },
      status: { type: 'string', enum: ['active', 'suspended', 'trial'] },
      subdomain: { type: 'string' },
    },
  },
  'PATCH /global-admin/tenants/:id/modules/:moduleKey': {
    type: 'object',
    properties: { enabled: { type: 'boolean' } },
    required: ['enabled'],
  },
};

/** (controller, handler) → tag de OpenAPI. */
const TAGS: Readonly<Record<string, string>> = {
  'ai-advisor': 'Asistentes IA',
  auth: 'Autenticación',
  'core-mes-production': 'Producción',
  costs: 'Costes',
  'global-admin': 'Global Admin',
  health: 'Sistema',
  incidencias: 'Incidencias',
  'manufacturing-models': 'Catálogos',
  materials: 'Materiales',
  oee: 'OEE',
  orders: 'Órdenes',
  quality: 'Calidad',
  'tenant-capabilities': 'Tenant',
  toolings: 'Utillaje',
  users: 'Usuarios',
  workstations: 'Catálogos',
};

/** Query params declarados a mano (los controladores leen @Query suelto). */
const QUERY_PARAMS: Readonly<Record<string, { name: string; required: boolean }[]>> = {
  'GET /production/time-logs/mine': [
    { name: 'from', required: true },
    { name: 'to', required: true },
  ],
  'GET /oee/workstation/:workstationId': [
    { name: 'startDate', required: true },
    { name: 'endDate', required: true },
  ],
  'GET /oee/workstations': [
    { name: 'startDate', required: true },
    { name: 'endDate', required: true },
  ],
  'GET /oee/workstation/:workstationId/downtime': [
    { name: 'startDate', required: true },
    { name: 'endDate', required: true },
  ],
  'GET /tenant/capabilities/audit': [
    { name: 'limit', required: false },
    { name: 'offset', required: false },
    { name: 'from', required: false },
    { name: 'to', required: false },
  ],
};

const CONTROLLERS: ReadonlyArray<readonly [string, { new (...args: never[]): object }]> = [
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

const reflector = new Reflector();

function esPublica(path: string): boolean {
  return [...RUTAS_PUBLICAS].some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p));
}

export function buildOpenApiDocument(): OpenApiDocument {
  const paths: Record<string, OpenApiPathItem> = {};

  for (const [nombre, controller] of CONTROLLERS) {
    const prefijo = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '');
    const prototype = controller.prototype as Record<string, unknown>;

    for (const metodo of Object.getOwnPropertyNames(prototype)) {
      if (metodo === 'constructor') continue;
      const handler = prototype[metodo] as object | undefined;
      if (!handler || typeof handler !== 'function') continue;
      const ruta = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      if (ruta === undefined) continue;

      const verbNum = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
      // RequestMethod de Nest es numérico (0=GET…4=PATCH), no un string.
      const METHOD_NAMES: Readonly<Record<number, 'get' | 'post' | 'put' | 'delete' | 'patch'>> = {
        0: 'get',
        1: 'post',
        2: 'put',
        3: 'delete',
        4: 'patch',
      };
      const verb = verbNum !== undefined ? METHOD_NAMES[verbNum] : undefined;
      if (!verb) continue;

      const path = `/${prefijo}${ruta === '/' ? '' : `/${ruta}`}`;
      const pathOpenApi = path.replace(/:(\w+)/g, '{$1}');
      const clave = `${nombre}.${metodo}`;

      const op: OpenApiOperation = {
        summary: RESUMENES[clave] ?? `${metodo}`,
        operationId: clave.replace(/[-.](\w)/g, (_, c: string) => c.toUpperCase()),
        tags: [TAGS[nombre] ?? nombre],
      };

      const rutaConcreta = `${verb.toUpperCase()} ${path}`;
      if (!esPublica(path)) {
        op.security = [{ bearerAuth: [] }];
      } else {
        op.security = [];
      }

      const params: { name: string; in: string; required: boolean; schema: { type: string } }[] = [];
      const pathParams = [...path.matchAll(/:(\w+)/g)].map((m) => m[1]);
      for (const p of pathParams) {
        params.push({ name: p, in: 'path', required: true, schema: { type: 'string' } });
      }
      const queries = QUERY_PARAMS[rutaConcreta];
      if (queries) {
        for (const q of queries) {
          params.push({ name: q.name, in: 'query', required: q.required, schema: { type: 'string' } });
        }
      }
      if (params.length > 0) op.parameters = params;

      const zodBody = BODY_SCHEMAS.get(rutaConcreta);
      const literalBody = LITERAL_BODIES[rutaConcreta];
      if (verb !== 'get' && verb !== 'delete' && (zodBody || literalBody)) {
        const schema = zodBody
          ? (zodToJsonSchema(zodBody, { target: 'openApi3', $refStrategy: 'none' }) as object)
          : literalBody;
        op.requestBody = {
          required: true,
          content: { 'application/json': { schema } },
        };
      }

      // El upload móvil es multipart con un campo de archivo, no JSON.
      if (rutaConcreta === 'POST /incidencias/upload-mobile/:sessionId') {
        op.requestBody = {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { foto: { type: 'string', format: 'binary' } },
              },
            },
          },
        };
      }

      const item = (paths[pathOpenApi] ??= {});
      (item as Record<string, unknown>)[verb] = op;
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Kavana Manufacturing API',
      version: '1.0.0',
      description:
        'MES industrial multi-tenant. Autenticación Bearer JWT. La spec se genera desde los metadatos de NestJS y los DTOs zod reales (tarea 3.4, ADR-011).',
    },
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  };
}
