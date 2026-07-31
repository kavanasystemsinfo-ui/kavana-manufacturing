import { z } from 'zod';

export const createIncidenciaSchema = z.object({
  workstation_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
  reported_by: z.string().uuid(),
  type: z.enum(['calidad', 'seguridad', 'mantenimiento', 'produccion', 'otro']).default('produccion'),
  severity: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const updateIncidenciaSchema = z.object({
  workstation_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
  type: z.enum(['calidad', 'seguridad', 'mantenimiento', 'produccion', 'otro']).optional(),
  severity: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['abierto', 'en_progreso', 'resuelto', 'cerrado']).optional(),
  assigned_to: z.string().uuid().optional(),
  resolved_at: z.string().datetime().optional(),
});
