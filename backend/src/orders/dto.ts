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

const ORDER_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

/**
 * Filtros de la lista de órdenes. El panel de supervisión pinta una tarjeta por
 * orden, así que sin filtro ni tope la pantalla intenta dibujar el histórico
 * entero (1.200+ órdenes) y la página se vuelve inmanejable: por eso hay un
 * tope por defecto aunque el cliente no lo pida.
 */
export const ListOrdersQuerySchema = z.object({
  // Lista separada por comas: ?status=pending,in_progress
  status: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is (typeof ORDER_STATUSES)[number] => (ORDER_STATUSES as readonly string[]).includes(s)),
    ),
  workstation_id: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
