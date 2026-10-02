import { z } from 'zod';

/**
 * El periodo que se pide al panel de OEE.
 *
 * Antes, una consulta sin fechas —o con la fecha al revés— no daba error:
 * llegaba a la base con valores vacíos y volvía con ceros, que en pantalla se
 * leían como un OEE de verdad. Ahora el periodo se valida y una petición mal
 * formada se rechaza con un 400 y su motivo.
 */

const fecha = z
  .string()
  .trim()
  .min(1, 'falta la fecha')
  .refine((valor) => !Number.isNaN(Date.parse(valor)), 'la fecha no es válida');

export const rangoOeeSchema = z
  .object({
    startDate: fecha,
    endDate: fecha,
  })
  .refine((rango) => Date.parse(rango.startDate) <= Date.parse(rango.endDate), {
    message: 'el periodo empieza después de terminar',
  });

export type RangoOee = z.infer<typeof rangoOeeSchema>;
