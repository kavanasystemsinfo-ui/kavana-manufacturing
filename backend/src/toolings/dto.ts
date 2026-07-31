import { z } from 'zod';

export const createToolingSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  type: z.enum(['troquel', 'molde', 'punzon', 'rodillo', 'matriz', 'otro']).optional().default('troquel'),
  location: z.string().max(255).optional(),
  current_cycles: z.number().int().min(0).optional().default(0),
  max_cycles: z.number().int().min(1).optional().default(100000),
  warning_pct: z.number().int().min(1).max(100).optional().default(80),
  cycles_per_piece: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

export const updateToolingSchema = createToolingSchema.partial().extend({
  status: z.enum(['activo', 'mantenimiento', 'retirado']).optional(),
});
