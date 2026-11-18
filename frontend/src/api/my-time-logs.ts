import { callApiWithTimeout } from './client.js';
import { partesEnMadrid, instanteMadrid, sumarDias, isoDe } from '../utils/planta-calendario.js';

/** Estas cargas son de pantalla y el servidor puede estar despertando: se espera más que en una acción. */
const LOGS_TIMEOUT_MS = 45000;

export interface MyTimeLog {
  id: string;
  order_id: string;
  workstation_id: string;
  operator_id: string;
  type: 'produccion' | 'parada';
  downtime_reason: string | null;
  start_time: string;
  end_time: string;
  produced_quantity: number | null;
  defect_quantity: number | null;
  observations: string | null;
  is_offline_event: boolean;
}

/**
 * Rango [inicio, fin) del DÍA FABRIL del operario: de las 22:00 de un día a
 * las 22:00 del siguiente, en hora de la planta (Europe/Madrid). Si son las
 * 21:59 el día fabril es el de hoy (empezó ayer a las 22:00); a las 22:00 en
 * punto ya empieza el día fabril de mañana. La API filtra por instantes ISO,
 * así que el cambio de hora se resuelve solo al pasar los instantes correctos.
 */
export function localDayRange(now: Date = new Date()): { from: string; to: string } {
  const p = partesEnMadrid(now);
  // Día fabril en curso: si ya son las 22:00 o más, termina mañana a las 22:00;
  // si no, termina hoy a las 22:00. El inicio es siempre 24 h antes (mismo día
  // de calendario menos uno a las 22:00).
  const jornadaFin = p.h >= 22 ? sumarDias(isoDe(p.y, p.m, p.d), 1) : isoDe(p.y, p.m, p.d);
  const jornadaInicio = sumarDias(jornadaFin, -1);
  const from = instanteMadrid(...diaDeIso(jornadaInicio), 22, 0);
  const to = instanteMadrid(...diaDeIso(jornadaFin), 22, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function diaDeIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

export async function fetchMyTimeLogs(range: { from: string; to: string }): Promise<MyTimeLog[]> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  return callApiWithTimeout<MyTimeLog[]>(`/api/v1/production/time-logs/mine?${params.toString()}`, {}, LOGS_TIMEOUT_MS);
}

/** Bloques ya registrados de una orden, del más antiguo al más nuevo. */
export async function fetchOrderLogs(orderId: string): Promise<MyTimeLog[]> {
  return callApiWithTimeout<MyTimeLog[]>(`/api/v1/production/orders/${orderId}/logs`, {}, LOGS_TIMEOUT_MS);
}
