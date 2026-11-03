import { useState, useEffect } from 'react';
import { listOrders, listWorkstations, listManufacturingModels } from '../../api/admin-entities.js';
import type { Order } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { ORDERS_HELP } from '../../help-content.js';

interface Props { isClassic?: boolean; }

export function OrdersTab({ isClassic }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [modelos, setModelos] = useState<Record<string, string>>({});
  const [puestos, setPuestos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders().then(setOrders).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
    // Nombres para no enseñar identificadores internos. Si fallan, la tabla sigue y la celda queda en blanco.
    listManufacturingModels().then((m) => setModelos(Object.fromEntries(m.map((x) => [x.id, x.name])))).catch(() => undefined);
    listWorkstations().then((w) => setPuestos(Object.fromEntries(w.map((x) => [x.id, x.name])))).catch(() => undefined);
  }, []);

  const th = isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200' : 'px-4 py-3 text-left text-sm text-gray-400';
  const td = isClassic ? 'px-4 py-3 text-sm border-b border-gray-100' : 'px-4 py-3 text-sm border-b border-gray-700/50';
  const tableBg = isClassic ? 'bg-white' : 'bg-gray-800/80 backdrop-blur-sm';
  const tableBorder = isClassic ? 'border border-gray-200 shadow-sm' : 'border border-gray-700';
  const label = isClassic ? 'text-sm font-semibold text-gray-700' : 'text-lg font-semibold';
  const errBg = isClassic ? 'bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm' : 'bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm';
  const statusBadge = (s: string) => {
    const base = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    if (isClassic) {
      return `${base} ${s === 'completed' ? 'bg-green-100 text-green-700' : s === 'in_progress' ? 'bg-orange-100 text-orange-700' : s === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`;
    }
    return `${base} ${s === 'completed' ? 'bg-green-900/50 text-green-300' : s === 'in_progress' ? 'bg-blue-900/50 text-blue-300' : s === 'cancelled' ? 'bg-red-900/50 text-red-300' : 'bg-gray-600 text-gray-300'}`;
  };

  return (
    <div className={isClassic ? '' : 'space-y-4'}>
      <div className={isClassic ? 'px-4 py-3 border-b border-gray-200 flex items-center justify-between' : 'flex items-center gap-3'}>
        <div className="flex items-center gap-3">
          <h2 className={label}>Órdenes de Producción</h2>
          <HelpModal {...ORDERS_HELP} theme={isClassic ? 'classic' : undefined} />
        </div>
      </div>
      {error && <div className={isClassic ? 'mx-4 mt-3' : ''}><div className={errBg}>{error}</div></div>}
      {loading ? (
        <div className={isClassic ? 'px-4 py-8 text-center text-sm text-gray-400' : 'text-center py-8 text-gray-400'}>Cargando...</div>
      ) : (
        <div className={`${tableBg} rounded-xl ${tableBorder} ${isClassic ? '' : 'overflow-hidden'}`}>
          <div className={isClassic ? 'overflow-x-auto' : ''}>
            <table className="w-full">
              <thead>
                <tr className={isClassic ? '' : 'border-b border-gray-700 text-left text-sm text-gray-400'}>
                  <th className={th}>Orden</th>
                  <th className={th}>Producto</th>
                  <th className={th}>Puesto</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Cantidad</th>
                  <th className={th}>Creado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className={isClassic ? 'hover:bg-gray-50 transition-colors' : 'hover:bg-gray-700/30 transition-colors'}>
                    <td className={`${td} font-medium`}>{o.code || 'Sin número'}</td>
                    <td className={td}>{modelos[o.model_id] ?? ''}</td>
                    <td className={td}>{puestos[o.workstation_id] ?? ''}</td>
                    <td className={td}><span className={statusBadge(o.status)}>{({ pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada', cancelled: 'Cancelada' } as any)[o.status]}</span></td>
                    <td className={td}>{o.quantity.toLocaleString('es-ES')}</td>
                    <td className={`${td} text-gray-400`}>{new Date(o.created_at).toLocaleDateString('es-ES')}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className={isClassic ? `${td} text-center text-gray-400 py-6` : 'px-4 py-8 text-center text-gray-500'}>No hay órdenes registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
