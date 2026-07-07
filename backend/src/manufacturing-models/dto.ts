import { z } from 'zod';

const unitOfMeasureEnum = z.enum(['piezas/h', 'm/h', 'kg/h', 'L/h']);

export const CreateManufacturingModelDtoSchema = z.object({
  name: z.string().min(1).max(100),
  unit_of_measure: unitOfMeasureEnum.optional(),
  target_rate: z.number().positive().optional(),
  workstation_id: z.string().uuid().optional(),
});

export const UpdateManufacturingModelDtoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unit_of_measure: unitOfMeasureEnum.optional(),
  target_rate: z.number().positive().optional(),
  workstation_id: z.string().uuid().nullable().optional(),
});

export type CreateManufacturingModelDto = z.infer<typeof CreateManufacturingModelDtoSchema>;
export type UpdateManufacturingModelDto = z.infer<typeof UpdateManufacturingModelDtoSchema>;
