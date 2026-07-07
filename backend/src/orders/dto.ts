import { z } from 'zod';

export const CreateOrderDtoSchema = z.object({
  model_id: z.string().uuid(),
  workstation_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  custom_fields: z.record(z.unknown()).optional().default({}),
});

export const UpdateOrderDtoSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  workstation_id: z.string().uuid().optional(),
  custom_fields: z.record(z.unknown()).optional(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderDtoSchema>;
export type UpdateOrderDto = z.infer<typeof UpdateOrderDtoSchema>;
