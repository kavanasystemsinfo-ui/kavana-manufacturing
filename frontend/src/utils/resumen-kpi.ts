/**
 * Rendimiento del día para el panel de supervisión.
 *
 * Regresión del bug de "Producción real": `produced_quantity` es NUMERIC en pg
 * y node-postgres lo devuelve como string ("1827.0000"). Un reduce que suma
 * string + number concatena en vez de sumar y la tarjeta se leía
 * "01827.00001328.0000..." con un "NaN% cumplimiento" debajo. Aquí todo pasa
 * por `unidades()`, que garantiza números de verdad.
 */

export type NivelRendimiento = 'verde' | 'ambar' | 'rojo';

export interface RendimientoDia {
  /** Suma de `quantity` de las órdenes creadas hoy. */
  objetivo: number;
  /** Suma de `produced_quantity` de esas órdenes. */
  real: number;
  /** % redondeado; null cuando no hay objetivo (no se puede cumplir lo que no existe). */
  cumplimiento: number | null;
  /** 0..100 para la barra de progreso, acotada aunque se sobreproduzca. */
  progresoPct: number;
  nivel: NivelRendimiento;
}

/**
 * Convierte lo que devuelve pg en unidades contables. Un texto ilegible vale
 * cero: mejor un cero honesto que un NaN que contamina la suma entera.
 */
export function unidades(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : typeof valor === 'string' ? Number(valor) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export interface OrdenRendimiento {
  created_at: string | Date;
  quantity: unknown;
  produced_quantity: unknown;
}

function esMismoDia(fecha: Date, referencia: Date): boolean {
  return (
    fecha.getFullYear() === referencia.getFullYear() &&
    fecha.getMonth() === referencia.getMonth() &&
    fecha.getDate() === referencia.getDate()
  );
}

export function rendimientoDelDia(
  ordenes: readonly OrdenRendimiento[],
  ahora: Date = new Date(),
): RendimientoDia {
  let objetivo = 0;
  let real = 0;

  for (const orden of ordenes) {
    const creada = new Date(orden.created_at);
    if (Number.isNaN(creada.getTime()) || !esMismoDia(creada, ahora)) continue;
    objetivo += unidades(orden.quantity);
    real += unidades(orden.produced_quantity);
  }

  const ratio = objetivo > 0 ? real / objetivo : 0;
  const nivel: NivelRendimiento =
    objetivo <= 0 || ratio >= 0.95 ? 'verde' : ratio >= 0.8 ? 'ambar' : 'rojo';

  return {
    objetivo,
    real,
    cumplimiento: objetivo > 0 ? Math.round(ratio * 100) : null,
    progresoPct: objetivo > 0 ? Math.min(ratio * 100, 100) : 0,
    nivel,
  };
}
