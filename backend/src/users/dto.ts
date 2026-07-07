import { z } from 'zod';

export const CreateUserDtoSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(255),
  role: z.enum(['tenant_admin', 'supervisor', 'operario']),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  employee_number: z.number().int().positive().optional(),
  operator_category: z.enum(['peon_especialista', 'oficial_3', 'oficial_2', 'oficial_1']).optional(),
  default_workstation_id: z.string().uuid().nullable().optional(),
});

export const UpdateUserDtoSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).max(255).optional(),
  role: z.enum(['tenant_admin', 'supervisor', 'operario']).optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  employee_number: z.number().int().positive().nullable().optional(),
  operator_category: z.enum(['peon_especialista', 'oficial_3', 'oficial_2', 'oficial_1']).optional(),
  default_workstation_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;
