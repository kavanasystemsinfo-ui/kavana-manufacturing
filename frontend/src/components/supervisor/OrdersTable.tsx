import type { Order } from '../../api/supervisor.js';
import { ORDER_STATUS_LABELS } from '../../utils/order-filters.js';
import {
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_ICON,
  themed,
} from '../../utils/ui-tokens.js';
import { ConfirmButton } from './ConfirmButton.js';
import { OrderProgress } from './OrderProgress.js';

interface OrdersTableProps {
  isClassic?: boolean;
  orders: Order[];
  onStatusChange: (orderId: string, status: string) => void;
  onDelete: (orderId: string) => void;
  onActivity: (orderId: string) => void;
  /** Orden cuya actividad está desplegada. */
  expandedOrder?: string | null;
}

const SIGUIENTE_ESTADO: Record<string, { status: string; label: string } | undefined> = {
  pending: { status: 'in_progress', label: 'Iniciar' },
  in_progress: { status: 'completed', label: 'Completar' },
};

/**
 * Vista de lista del panel de supervisión: una fila por orden, columnas
 * alineadas.
 *
 * En tarjetas, cada orden ocupaba 120 px de alto para tres datos; en una tabla
 * caben veinte de un vistazo y se pueden comparar puesto y avance de un barrido
 * vertical. Las columnas son las mismas en los dos temas: el tema cambia el
 * color, no lo que se ve ni lo que se puede hacer.
 */
export function OrdersTable({ isClassic, orders, onStatusChange, onDelete, onActivity, expandedOrder }: OrdersTableProps) {
  const cabecera = isClassic
    ? 'border-b border-slate-200 bg-slate-50 text-slate-500'
    : 'border-b border-kavana-steel/30 bg-kavana-dark/70 text-slate-400';
  const fila = isClassic
    ? 'border-b border-slate-100 hover:bg-slate-50'
    : 'border-b border-kavana-steel/15 hover:bg-kavana-dark/40';

  return (
    <div className={`overflow-x-auto ${isClassic ? 'rounded-lg border border-slate-200 bg-white' : 'rounded-2xl border border-kavana-steel/25 bg-kavana-surface'}`}>
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className={cabecera}>
            <th scope="col" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Orden</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Modelo</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Puesto</th>
            <th scope="col" className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide">Cantidad</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Progreso</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Estado</th>
            <th scope="col" className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const siguiente = SIGUIENTE_ESTADO[order.status];
            return (
              <tr key={order.id} className={fila}>
                <td className="px-3 py-2 font-bold whitespace-nowrap">{order.code || '—'}</td>
                <td className="px-3 py-2">{order.model_name}</td>
                <td className="px-3 py-2">{order.workstation_name}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{order.quantity}</td>
                <td className="px-3 py-2">
                  <OrderProgress
                    isClassic={isClassic}
                    produced={order.produced_quantity}
                    quantity={order.quantity}
                    defects={order.defect_quantity}
                    compact
                  />
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${themed(ORDER_STATUS_BADGE[order.status] ?? ORDER_STATUS_BADGE.cancelled, isClassic)}`}>
                    <span aria-hidden="true">{ORDER_STATUS_ICON[order.status] ?? '•'}</span>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {siguiente && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(order.id, siguiente.status)}
                        className={themed(BUTTON_PRIMARY, isClassic)}
                      >
                        {siguiente.label}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-expanded={expandedOrder === order.id}
                      onClick={() => onActivity(order.id)}
                      className={themed(BUTTON_SECONDARY, isClassic)}
                    >
                      Actividad
                    </button>
                    <ConfirmButton
                      label="Eliminar"
                      ariaLabel={`Eliminar la orden ${order.code || order.id}`}
                      onConfirm={() => onDelete(order.id)}
                      className={themed(BUTTON_DANGER, isClassic)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && (
        <p className="px-4 py-8 text-center text-sm opacity-70">No hay órdenes con estos filtros.</p>
      )}
    </div>
  );
}
