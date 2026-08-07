import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { listOrders } from '../../api/admin-entities.js';
import type { Order } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { ORDERS_HELP } from '../../help-content.js';

export function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders().then(setOrders).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Órdenes de Producción</h2>
        <HelpModal {...ORDERS_HELP} />
      </div>
      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-400">{o.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      o.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                      o.status === 'in_progress' ? 'bg-blue-900/50 text-blue-300' :
                      o.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {{ pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada', cancelled: 'Cancelada' }[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{o.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay órdenes registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
