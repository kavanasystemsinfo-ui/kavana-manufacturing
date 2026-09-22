import { KanbanColumns } from './ui/KanbanColumns.js';
import { formatNumber } from '../utils/formatNumber.js';

interface Order {
  id: string;
  code?: string;
  model_name: string | null;
  workstation_name: string | null;
  workstation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  quantity: number;
  produced_quantity: number;
  defect_quantity: number;
}

interface KanbanBoardProps {
  orders: Order[];
  changeOrderStatus: (orderId: string, targetStatus: string) => void;
  loadOrders: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/40',
  in_progress: 'bg-blue-500/20 text-blue-300 ring-blue-500/40',
  completed: 'bg-green-500/20 text-green-300 ring-green-500/40',
  cancelled: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const COLUMNS = [
  { status: 'pending', title: 'Pendiente' },
  { status: 'in_progress', title: 'En Progreso' },
  { status: 'completed', title: 'Completada' },
];

/**
 * Tablero de órdenes de producción.
 *
 * El arrastre, las columnas y las zonas de soltado viven en KanbanColumns, que
 * comparte con el tablero de incidencias. Antes cada columna montaba su propio
 * DndContext y no era una zona de soltado, así que soltar en una columna vacía
 * no hacía nada.
 */
export function KanbanBoard({ orders, changeOrderStatus }: KanbanBoardProps) {
  return (
    <KanbanColumns
      columns={COLUMNS}
      items={orders}
      onMove={changeOrderStatus}
      ariaLabel="Órdenes de producción"
      renderCard={(order) => (
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </span>
              <span className="text-base font-bold text-white">{order.code || '—'}</span>
            </div>
            <span className="text-xs text-slate-500" aria-hidden="true">
              ≡
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span>{order.workstation_name || order.workstation_id}</span>
            <span>·</span>
            <span>{formatNumber(order.quantity)} uds.</span>
            {order.model_name && <span className="text-slate-500">{order.model_name}</span>}
          </div>
        </div>
      )}
    />
  );
}
