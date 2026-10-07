/**
 * Cálculos puros del panel de supervisión.
 *
 * Existen aparte del service para poder probarlos sin tocar la base: aquí es
 * donde vive la fórmula del OEE por día y la conversión de los tipos que pg
 * manda como string (NUMERIC, bigint), que es exactamente el fallo que dejó
 * "Producción real" pintada como "01827.00001328.0000..." en el panel.
 */

export interface OeeDia {
  date: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface AcumuladoDiario {
  date: string;
  prodSec: number;
  stopSec: number;
  produced: number;
  defects: number;
  expected: number;
}

/**
 * pg devuelve NUMERIC y los conteos (bigint) como string; un null o un texto
 * ilegible no puede teñir la suma de NaN. Todo lo que entra aquí sale como
 * número finito mayor o igual que cero.
 */
export function num(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : typeof valor === 'string' ? Number(valor) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const redondear = (valor: number): number => Math.round(valor * 100) / 100;

/**
 * OEE de un día, con el mismo criterio que `oee.calculo.ts`:
 * - Disponibilidad: tiempo produciendo sobre tiempo registrado (paradas sin
 *   apuntar no existen, y eso se nota aquí).
 * - Rendimiento: piezas reales sobre las que el objetivo del modelo promete
 *   para ese tiempo, con tope en 100 %.
 * - Calidad: piezas buenas sobre piezas producidas.
 *
 * Sin objetivo conocido el rendimiento es 0, no un número inventado.
 */
export function calcularOeeDia(acumulado: AcumuladoDiario): OeeDia {
  const tiempoRegistrado = acumulado.prodSec + acumulado.stopSec;
  const availability = tiempoRegistrado > 0 ? (acumulado.prodSec / tiempoRegistrado) * 100 : 0;
  const performance =
    acumulado.expected > 0 ? Math.min((acumulado.produced / acumulado.expected) * 100, 100) : 0;
  const quality =
    acumulado.produced > 0
      ? Math.max(((acumulado.produced - acumulado.defects) / acumulado.produced) * 100, 0)
      : 0;
  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

  return {
    date: acumulado.date,
    availability: redondear(availability),
    performance: redondear(performance),
    quality: redondear(quality),
    oee: redondear(oee),
  };
}
