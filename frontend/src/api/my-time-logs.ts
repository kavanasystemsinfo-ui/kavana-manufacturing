import { callApiWithTimeout } from './client.js';

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
 * Rango [inicio, fin) del día local del operario, no del día UTC: el turno
 * de noche empieza y acaba según el reloj de la planta, y la API filtra por
 * instantes ISO con offset.
 */
export function localDayRange(now: Date = new Date()): { from: string; to: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export async function fetchMyTimeLogs(range: { from: string; to: string }): Promise<MyTimeLog[]> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  return callApiWithTimeout<MyTimeLog[]>(`/api/v1/production/time-logs/mine?${params.toString()}`, {}, LOGS_TIMEOUT_MS);
}

/** Bloques ya registrados de una orden, del más antiguo al más nuevo. */
export async function fetchOrderLogs(orderId: string): Promise<MyTimeLog[]> {
  return callApiWithTimeout<MyTimeLog[]>(`/api/v1/production/orders/${orderId}/logs`, {}, LOGS_TIMEOUT_MS);
}
