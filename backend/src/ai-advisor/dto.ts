import { z } from 'zod';

export const askAdvisorSchema = z.object({
  question: z.string().min(3, 'La pregunta debe tener al menos 3 caracteres').max(1000),
  context_filter: z.object({
    order_id: z.string().uuid().optional(),
    workstation_id: z.string().uuid().optional(),
    model_id: z.string().uuid().optional(),
  }).optional(),
});
