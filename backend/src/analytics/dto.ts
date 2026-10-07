import { z } from 'zod';

/**
 * Días de histórico que pide el panel. El tope (90) evita que un ?days=99999
 * convierta una consulta de dashboard en un barrido del histórico completo.
 */
const dias = (defecto: number) =>
  z.object({
    days: z.coerce
      .number()
      .int('days debe ser un número entero')
      .min(1, 'days mínimo 1')
      .max(90, 'days máximo 90')
      .default(defecto),
  });

export const ProductionDailyQuerySchema = dias(30);
export const DowntimeParetoQuerySchema = dias(30);
export const OeeDailyQuerySchema = dias(7);

/**
 * Horas de histórico de la tendencia intradía (máx. 168 = 7 días). El mismo
 * patrón que `dias`: tope para que un ?hours=99999 no barras el histórico.
 */
export const OeeHourlyQuerySchema = z.object({
  hours: z.coerce
    .number()
    .int('hours debe ser un número entero')
    .min(1, 'hours mínimo 1')
    .max(168, 'hours máximo 168')
    .default(24),
});

export type ProductionDailyQuery = z.infer<typeof ProductionDailyQuerySchema>;
export type DowntimeParetoQuery = z.infer<typeof DowntimeParetoQuerySchema>;
export type OeeDailyQuery = z.infer<typeof OeeDailyQuerySchema>;
export type OeeHourlyQuery = z.infer<typeof OeeHourlyQuerySchema>;
