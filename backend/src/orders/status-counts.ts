/**
 * Recuento de órdenes por estado para las tarjetas del panel de supervisión.
 * Es independiente del listado paginado: el listado solo trae pendientes y en
 * proceso, y contar ahí las completadas o canceladas daba siempre cero.
 */
export interface OrderStatusCounts {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total: number;
}

export function summarizeStatusCounts(rows: ReadonlyArray<{ status: string; n: unknown }>): OrderStatusCounts {
  const counts: OrderStatusCounts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0, total: 0 };
  for (const row of rows) {
    const n = Number(row.n);
    if (!Number.isFinite(n) || n < 0) continue;
    if (row.status === 'pending' || row.status === 'in_progress' || row.status === 'completed' || row.status === 'cancelled') {
      counts[row.status] += n;
    }
    counts.total += n;
  }
  return counts;
}
