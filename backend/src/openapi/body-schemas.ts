import { z } from 'zod';
import { createIncidenciaSchema, updateIncidenciaSchema } from '../incidencias/dto.js';
import { CreateUserDtoSchema, UpdateUserDtoSchema } from '../users/dto.js';
import { CreateWorkstationDtoSchema, UpdateWorkstationDtoSchema } from '../workstations/dto.js';
import { CreateManufacturingModelDtoSchema, UpdateManufacturingModelDtoSchema } from '../manufacturing-models/dto.js';
import { CreateOrderDtoSchema, UpdateOrderDtoSchema } from '../orders/dto.js';
import { createToolingSchema, updateToolingSchema } from '../toolings/dto.js';
import {
  createProductionOrderSchema,
  transitionProductionOrderSchema,
  syncWorkBlockSchema,
  updateCustomFieldsSchema,
} from '../core-mes-production/dto.js';
import { askAdvisorSchema } from '../ai-advisor/dto.js';
import type { ZodSchema } from 'zod';

/**
 * Índice de la fuente de verdad de los request bodies: el zod que cada
 * endpoint valida realmente al ejecutarse. La spec OpenAPI se deriva de
 * aquí, así que endpoint y documentación no pueden divergir en silencio.
 *
 * materials no valida (POST/PATCH llegan con `data: any` al servicio): su
 * contrato se declara literal en build-openapi-document.ts hasta que tenga
 * su zod. Los handlers que leen propiedades sueltas del body (amount, pieces,
 * enabled, types, quality/costs) tampoco usan zod de objeto completo: se
 * declaran literales por el mismo motivo.
 */
const ENTRIES: ReadonlyArray<readonly [string, ZodSchema]> = [
    ['POST /users', CreateUserDtoSchema],
    ['PUT /users/:id', UpdateUserDtoSchema],
    ['POST /workstations', CreateWorkstationDtoSchema],
    ['PUT /workstations/:id', UpdateWorkstationDtoSchema],
    ['POST /manufacturing-models', CreateManufacturingModelDtoSchema],
    ['PUT /manufacturing-models/:id', UpdateManufacturingModelDtoSchema],
    ['POST /orders', CreateOrderDtoSchema],
    ['PUT /orders/:id', UpdateOrderDtoSchema],
    ['POST /toolings', createToolingSchema],
    ['PUT /toolings/:id', updateToolingSchema],
    ['POST /production/orders', createProductionOrderSchema],
    ['POST /production/orders/:id/transition', transitionProductionOrderSchema],
    ['POST /production/time-logs/sync', syncWorkBlockSchema],
    ['PATCH /production/orders/:id/custom-fields', updateCustomFieldsSchema],
    ['POST /incidencias', createIncidenciaSchema],
    ['PUT /incidencias/:id', updateIncidenciaSchema],
    ['POST /ai-advisor/ask', askAdvisorSchema],
    ['POST /ai-advisor/ask-tech', askAdvisorSchema],
];

export const BODY_SCHEMAS: ReadonlyMap<string, ZodSchema> = new Map(ENTRIES);
