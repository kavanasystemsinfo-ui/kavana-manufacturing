/**
 * Ayudas del registro rápido de bloques: la hora de inicio sale sola del final
 * del bloque anterior y las cantidades se mueven con botones en vez de teclear.
 */
import type { SummaryLog } from './order-summary.js';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Hora local en formato HH:MM, el que usan los input type="time". */
export function toHHMM(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Hora de inicio sugerida: el final del último bloque de hoy (producción o
 * parada con duración), siempre que no sea posterior a «ahora». Sin bloques de
 * hoy no hay sugerencia y el operario la escribe.
 */
export function suggestBlockStart(logs: SummaryLog[], now: Date = new Date()): string | null {
  const today = now.toDateString();
  let best: Date | null = null;
  for (const log of logs) {
    const end = new Date(log.end_time);
    if (Number.isNaN(end.getTime()) || end.toDateString() !== today || end > now) continue;
    if (!best || end > best) best = end;
  }
  return best ? toHHMM(best) : null;
}

/** Suma `delta` a una cantidad escrita como texto; nunca baja de 0. */
export function stepQuantity(current: string, delta: number): string {
  const n = Number(current);
  const base = Number.isFinite(n) ? n : 0;
  return String(Math.max(0, Math.round(base + delta)));
}

/** Porcentaje con coma decimal y signo: 2.4 → «2,4 %». */
export function formatPercent(value: number): string {
  return `${String(value).replace('.', ',')} %`;
}

/** Cantidad con punto de miles también en 4 cifras (es-ES lo omite): 1000 → «1.000». */
export function formatThousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
