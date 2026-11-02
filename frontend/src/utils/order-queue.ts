/**
 * Cola de órdenes del operario: qué se muestra primero y cómo se lee cada tarjeta.
 *
 * El operario necesita ver lo que está en curso y lo que toca después, no un
 * backlog de decenas de órdenes. Las primeras `NEXT_LIMIT` pendientes se
 * enseñan como «Siguientes» y el resto queda plegado.
 */
export interface QueueOrder {
  id: string;
  code?: string | null;
  status: string;
  quantity: number | string;
  produced_quantity?: number | string | null;
  created_at?: string | null;
  model_name?: string | null;
  workstation_name?: string | null;
}

export interface OrderQueue<T extends QueueOrder> {
  inProgress: T[];
  next: T[];
  backlog: T[];
}

export const NEXT_LIMIT = 5;

function toNumber(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function byOldestFirst(a: QueueOrder, b: QueueOrder): number {
  const ta = a.created_at ? Date.parse(a.created_at) : 0;
  const tb = b.created_at ? Date.parse(b.created_at) : 0;
  if (ta !== tb) return ta - tb;
  return (a.code ?? a.id).localeCompare(b.code ?? b.id);
}

export function buildOrderQueue<T extends QueueOrder>(orders: T[], limit: number = NEXT_LIMIT): OrderQueue<T> {
  const inProgress = orders.filter((o) => o.status === 'in_progress').sort(byOldestFirst);
  const pending = orders.filter((o) => o.status !== 'in_progress').sort(byOldestFirst);
  return { inProgress, next: pending.slice(0, limit), backlog: pending.slice(limit) };
}

/** Código legible; si la orden no lo tiene, los 8 primeros caracteres del id. */
export function orderLabel(order: Pick<QueueOrder, 'id' | 'code'>): string {
  return order.code?.trim() || `#${order.id.slice(0, 8)}`;
}

/** Cantidad con separador de miles y unidad: 357.120 uds. */
export function formatQuantity(value: number | string | null | undefined): string {
  return `${Math.round(toNumber(value)).toLocaleString('es-ES')} uds`;
}

/** Avance 0-100 de lo producido sobre lo previsto; nunca pasa de 100. */
export function orderProgress(order: Pick<QueueOrder, 'quantity' | 'produced_quantity'>): number {
  const total = toNumber(order.quantity);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((toNumber(order.produced_quantity) / total) * 100));
}
