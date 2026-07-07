import { z } from 'zod';

export const CreateWorkstationDtoSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const UpdateWorkstationDtoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type CreateWorkstationDto = z.infer<typeof CreateWorkstationDtoSchema>;
export type UpdateWorkstationDto = z.infer<typeof UpdateWorkstationDtoSchema>;
