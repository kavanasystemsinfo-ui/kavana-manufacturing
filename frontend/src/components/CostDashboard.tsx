import { useEffect, useState } from 'react';
import { listOrders, type Order } from '../api/admin-entities.js';
import { createCostEntry, listCostEntries, getCostSummary, type CostEntry, type CostSummary } from '../api/admin-entities.js';
import { useThemeStore } from '../store/theme-store.js';

const CATEGORY_LABELS: Record<string, string> = {
  material: 'Material',
  labor: 'Mano de obra',
  overhead: 'Indirecto',
  energy: 'Energía',
};

const CATEGORY_COLORS: Record<string, string> = {
  material: 'bg-blue-500',
  labor: 'bg-green-500',
  overhead: 'bg-amber-500',
  energy: 'bg-purple-500',
};

export function CostDashboard() {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    order_id: '',
    category: 'material' as 'material' | 'labor' | 'overhead' | 'energy',
    amount: 0,
    currency: 'USD',
    description: '',
  });

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      void loadOrderData(selectedOrder);
    }
  }, [selectedOrder]);

  async function loadData() {
    try {
      setLoading(true);
      const o = await listOrders();
      setOrders(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadOrderData(orderId: string) {
    try {
      const [e, s] = await Promise.all([listCostEntries(orderId), getCostSummary(orderId)]);
      setEntries(e);
      setSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCreate() {
    try {
      await createCostEntry({
        order_id: form.order_id,
        category: form.category,
        amount: form.amount,
        currency: form.currency,
        description: form.description || undefined,
      });
      setShowCreate(false);
      setForm({ order_id: '', category: 'material', amount: 0, currency: 'USD', description: '' });
      if (selectedOrder) {
        void loadOrderData(selectedOrder);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>
        Cargando datos de costes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-semibold ${isClassic ? 'text-gray-800' : 'text-white'}`}>Gestión de Costes</h2>
        <button
          onClick={() => { setShowCreate(!showCreate); setForm({ ...form, order_id: selectedOrder ?? '' }); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isClassic ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          + Nuevo Coste
        </button>
      </div>

      {error && (
        <div className={`rounded-lg p-3 text-sm ${isClassic ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
          {error}
        </div>
      )}

      {showCreate && (
        <div className={`rounded-xl border p-4 space-y-3 ${isClassic ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/80 border-gray-700'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`}>
              <option value="">Seleccionar orden</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.id.slice(0, 8)} — {o.status}</option>
              ))}
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as 'material' | 'labor' | 'overhead' | 'energy' })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`}>
              <option value="material">Material</option>
              <option value="labor">Mano de obra</option>
              <option value="overhead">Indirecto</option>
              <option value="energy">Energía</option>
            </select>
            <input type="number" min="0" step="0.01" placeholder="Monto" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`} />
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
          <input placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`w-full ${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`} />
          <div className="flex gap-2">
            <button onClick={handleCreate} className={`px-4 py-2 rounded-lg text-sm font-medium ${isClassic ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>Guardar</button>
            <button onClick={() => setShowCreate(false)} className={`px-4 py-2 rounded-lg text-sm font-medium ${isClassic ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-600 text-white hover:bg-gray-500'}`}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-xl border p-4 ${isClassic ? 'bg-white border-gray-200' : 'bg-gray-800/60 border-gray-700'}`}>
          <h3 className={`text-sm font-medium mb-3 ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Seleccionar Orden</h3>
          <select
            value={selectedOrder ?? ''}
            onChange={(e) => setSelectedOrder(e.target.value || null)}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'}`}
          >
            <option value="">Todas las órdenes</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.id.slice(0, 8)} — {o.status}</option>
            ))}
          </select>
        </div>

        {summary && (
          <div className={`rounded-xl border p-4 ${isClassic ? 'bg-white border-gray-200' : 'bg-gray-800/60 border-gray-700'}`}>
            <h3 className={`text-sm font-medium mb-3 ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Resumen por Categoría</h3>
            <div className="space-y-2">
              {(['material', 'labor', 'overhead', 'energy'] as const).map((cat) => {
                const val = cat === 'material' ? summary.total_material : cat === 'labor' ? summary.total_labor : cat === 'overhead' ? summary.total_overhead : summary.total_energy;
                const pct = summary.total_cost > 0 ? Math.round((val / summary.total_cost) * 100) : 0;
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat]}`} />
                    <span className={`text-xs w-20 ${isClassic ? 'text-gray-600' : 'text-gray-400'}`}>{CATEGORY_LABELS[cat]}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                      <div className={`h-full ${CATEGORY_COLORS[cat]} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-mono w-16 text-right ${isClassic ? 'text-gray-800' : 'text-gray-200'}`}>{summary.currency} {val.toFixed(2)}</span>
                  </div>
                );
              })}
              <div className={`pt-2 border-t ${isClassic ? 'border-gray-200' : 'border-gray-700'}`}>
                <div className="flex justify-between">
                  <span className={`text-sm font-semibold ${isClassic ? 'text-gray-800' : 'text-white'}`}>Total</span>
                  <span className={`text-sm font-bold ${isClassic ? 'text-gray-800' : 'text-white'}`}>{summary.currency} {summary.total_cost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`rounded-xl border overflow-hidden ${isClassic ? 'bg-white border-gray-200' : 'bg-gray-800/60 border-gray-700'}`}>
        <table className="w-full">
          <thead>
            <tr className={`${isClassic ? 'bg-gray-50 border-b border-gray-200' : 'bg-gray-900/50 border-b border-gray-700'}`}>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Categoría</th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Monto</th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Descripción</th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className={`border-b ${isClassic ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-700/50 hover:bg-gray-700/30'}`}>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-opacity-20 ${
                    e.category === 'material' ? 'bg-blue-100 text-blue-800' :
                    e.category === 'labor' ? 'bg-green-100 text-green-800' :
                    e.category === 'overhead' ? 'bg-amber-100 text-amber-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[e.category]}`} />
                    {CATEGORY_LABELS[e.category]}
                  </span>
                </td>
                <td className={`px-4 py-3 text-sm font-mono ${isClassic ? 'text-gray-800' : 'text-gray-200'}`}>{e.currency} {e.amount.toFixed(2)}</td>
                <td className={`px-4 py-3 text-sm ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>{e.description ?? '—'}</td>
                <td className={`px-4 py-3 text-sm ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className={`px-4 py-8 text-center text-sm ${isClassic ? 'text-gray-400' : 'text-gray-500'}`}>
                  No hay entradas de costes registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
