import { KanbanColumns } from './ui/KanbanColumns.js';
import { OrderProgress } from './supervisor/OrderProgress.js';
import { ConfirmButton } from './supervisor/ConfirmButton.js';
import { formatNumber } from '../utils/formatNumber.js';
import { ORDER_STATUS_LABELS } from '../utils/order-filters.js';
import {
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_ICON,
  themed,
} from '../utils/ui-tokens.js';

interface Order {
  id: string;
  code?: string | null;
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
  /** Se mantiene por compatibilidad con quien ya lo pasaba. */
  loadOrders?: () => void;
  isClassic?: boolean;
  onDelete?: (orderId: string) => void;
}

const COLUMNS_BASE = [
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
 * no hacía nada. Cada tarjeta lleva además su acción explícita: arrastrar es
 * cómodo con ratón y con dedo, pero no puede ser la única forma de cambiar el
 * estado (teclado y lectores de pantalla incluidos).
 */
export function KanbanBoard({ orders, changeOrderStatus, isClassic, onDelete }: KanbanBoardProps) {
  // La columna de canceladas solo aparece si hay algo cancelado: un tablero fijo
  // de cuatro columnas deja media pantalla vacía todos los días.
  const hayCanceladas = orders.some((o) => o.status === 'cancelled');
  const columns = hayCanceladas
    ? [...COLUMNS_BASE, { status: 'cancelled', title: 'Cancelada' }]
    : COLUMNS_BASE;

  return (
    <KanbanColumns
      columns={columns}
      items={orders}
      onMove={changeOrderStatus}
      isClassic={isClassic}
      ariaLabel="Órdenes de producción"
      renderCard={(order) => {
        const siguiente =
          order.status === 'pending'
            ? { status: 'in_progress', label: 'Iniciar' }
            : order.status === 'in_progress'
              ? { status: 'completed', label: 'Completar' }
              : null;
        return (
          <div>
            <div className="flex items-start justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${themed(ORDER_STATUS_BADGE[order.status], isClassic)}`}
              >
                <span aria-hidden="true">{ORDER_STATUS_ICON[order.status]}</span>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span className="text-xs opacity-60" aria-hidden="true">
                ⠿
              </span>
            </div>
            <p className="mt-2 truncate text-base font-bold">{order.code || 'Sin N.º de orden'}</p>
            <p className="truncate text-xs opacity-80">{order.model_name || 'Sin modelo'}</p>
            <p className="mt-1 truncate text-xs opacity-70">
              {order.workstation_name || order.workstation_id} · {formatNumber(order.quantity)} uds.
            </p>
            <OrderProgress
              isClassic={isClassic}
              produced={order.produced_quantity}
              quantity={order.quantity}
              defects={order.defect_quantity}
            />
            {(siguiente || onDelete) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {siguiente && (
                  <button
                    type="button"
                    onClick={() => changeOrderStatus(order.id, siguiente.status)}
                    className={themed(BUTTON_PRIMARY, isClassic)}
                  >
                    {siguiente.label}
                  </button>
                )}
                {onDelete && (
                  <ConfirmButton
                    label="Eliminar"
                    ariaLabel={`Eliminar la orden ${order.code || order.id}`}
                    onConfirm={() => onDelete(order.id)}
                    className={themed(BUTTON_DANGER, isClassic)}
                  />
                )}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
