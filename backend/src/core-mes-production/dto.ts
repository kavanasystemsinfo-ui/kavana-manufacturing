import { z } from 'zod';

export const PRODUCTION_ORDER_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export const WORK_BLOCK_TYPES = ['produccion', 'parada'] as const;

export const createProductionOrderSchema = z.object({
  code: z.string().min(1).max(100),
  target_quantity: z.number().positive(),
  workstation_id: z.string().uuid().nullable().optional(),
  custom_fields: z.record(z.unknown()).default({}),
});

// Ahora el supervisor solo puede cambiar el estado manual si es necesario,
// pero lo normal es que avance automáticamente al meter partes de trabajo.
export const transitionProductionOrderSchema = z.object({
  target_status: z.enum(PRODUCTION_ORDER_STATUSES).refine((value) => value !== 'pending', {
    message: 'target_status cannot be pending.',
  }),
  workstation_id: z.string().uuid().nullable().optional(),
});

export const syncWorkBlockSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z
    .string()
    .regex(/^\d+$/, 'tenant_id must be numeric.')
    .transform((value) => BigInt(value)),
  order_id: z.string().uuid(),
  workstation_id: z.string().uuid(),
  operator_id: z.string().uuid(),
  type: z.enum(WORK_BLOCK_TYPES),
  start_time: z.string().datetime({ offset: true }),
  end_time: z.string().datetime({ offset: true }),
  downtime_reason: z.string().min(1).max(255).nullable().optional(),
  produced_quantity: z.number().int().nonnegative().optional(),
  defect_quantity: z.number().int().nonnegative().optional(),
  is_offline_event: z.boolean().optional().default(false),
  client_device_id: z.string().max(500).nullable().optional(),
}).refine((value) => value.type !== 'parada' || value.downtime_reason, {
  message: 'downtime_reason is required when type is parada.',
  path: ['downtime_reason'],
}).refine((value) => value.type !== 'produccion' || value.produced_quantity !== undefined, {
  message: 'produced_quantity is required when type is produccion.',
  path: ['produced_quantity'],
}).refine((value) => new Date(value.end_time) > new Date(value.start_time), {
  message: 'end_time must be strictly after start_time.',
  path: ['end_time'],
});

export const updateCustomFieldsSchema = z.object({
  custom_fields: z.record(z.unknown()),
});

export type CreateProductionOrderDto = z.infer<typeof createProductionOrderSchema>;
export type TransitionProductionOrderDto = z.infer<typeof transitionProductionOrderSchema>;
export type SyncWorkBlockDto = z.infer<typeof syncWorkBlockSchema>;
export type UpdateCustomFieldsDto = z.infer<typeof updateCustomFieldsSchema>;
