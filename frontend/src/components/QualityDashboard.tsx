import { useEffect, useState } from 'react';
import { listOrders, listWorkstations, type Order, type Workstation } from '../api/admin-entities.js';
import { createQualityCheck, listQualityChecks, getQualitySummary, type QualityCheck, type QualitySummary } from '../api/admin-entities.js';
import { useThemeStore } from '../store/theme-store.js';

export function QualityDashboard() {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';

  const [orders, setOrders] = useState<Order[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    order_id: '',
    workstation_id: '',
    result: 'pass' as 'pass' | 'fail' | 'conditional',
    defect_count: 0,
    defect_type: '',
    notes: '',
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
      const [o, w] = await Promise.all([listOrders(), listWorkstations()]);
      setOrders(o);
      setWorkstations(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadOrderData(orderId: string) {
    try {
      const [c, s] = await Promise.all([listQualityChecks(orderId), getQualitySummary(orderId)]);
      setChecks(c);
      setSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCreate() {
    try {
      await createQualityCheck({
        order_id: form.order_id,
        workstation_id: form.workstation_id,
        result: form.result,
        defect_count: form.defect_count,
        defect_type: form.defect_type || undefined,
        notes: form.notes || undefined,
      });
      setShowCreate(false);
      setForm({ order_id: '', workstation_id: '', result: 'pass', defect_count: 0, defect_type: '', notes: '' });
      if (selectedOrder) {
        void loadOrderData(selectedOrder);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function getWsName(id: string): string {
    return workstations.find((w) => w.id === id)?.name ?? id.slice(0, 8);
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>
        Cargando datos de calidad...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-semibold ${isClassic ? 'text-gray-800' : 'text-white'}`}>Control de Calidad</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { void loadData(); if (selectedOrder) void loadOrderData(selectedOrder); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isClassic ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔄 Actualizar
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setForm({ ...form, order_id: selectedOrder ?? '' }); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isClassic ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            + Nuevo Check
          </button>
        </div>
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
            <select value={form.workstation_id} onChange={(e) => setForm({ ...form, workstation_id: e.target.value })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`}>
              <option value="">Seleccionar puesto</option>
              {workstations.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as 'pass' | 'fail' | 'conditional' })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="conditional">Conditional</option>
            </select>
            <input type="number" min="0" placeholder="Defectos" value={form.defect_count} onChange={(e) => setForm({ ...form, defect_count: Number(e.target.value) })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Tipo de defecto (opcional)" value={form.defect_type} onChange={(e) => setForm({ ...form, defect_type: e.target.value })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`} />
            <input placeholder="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${isClassic ? 'border-gray-300 bg-white text-gray-900' : 'bg-gray-900 text-white border-gray-600'} border rounded-lg px-3 py-2 text-sm`} />
          </div>
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
            <h3 className={`text-sm font-medium mb-3 ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Resumen</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className={`text-2xl font-bold ${isClassic ? 'text-gray-800' : 'text-white'}`}>{summary.total_checks}</div>
                <div className={`text-xs ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{summary.passed}</div>
                <div className={`text-xs ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Pass</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
                <div className={`text-xs ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Fail</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${summary.pass_rate >= 80 ? 'text-green-500' : summary.pass_rate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{summary.pass_rate}%</div>
                <div className={`text-xs ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Pass Rate</div>
              </div>
            </div>
            <div className={`mt-3 h-2 rounded-full overflow-hidden ${isClassic ? 'bg-gray-100' : 'bg-gray-700'}`}>
              <div
                className={`h-full rounded-full transition-all ${summary.pass_rate >= 80 ? 'bg-green-500' : summary.pass_rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(summary.pass_rate, 100)}%` }}
              />
            </div>
            {summary.total_defects > 0 && (
              <div className={`mt-2 text-xs ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>
                {summary.total_defects} defecto{summary.total_defects !== 1 ? 's' : ''} registrado{summary.total_defects !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`rounded-xl border overflow-hidden ${isClassic ? 'bg-white border-gray-200' : 'bg-gray-800/60 border-gray-700'}`}>
        <table className="w-full">
          <thead>
            <tr className={`${isClassic ? 'bg-gray-50 border-b border-gray-200' : 'bg-gray-900/50 border-b border-gray-700'}`}>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Puesto</th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Resultado</th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Defectos</th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Tipo</th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.id} className={`border-b ${isClassic ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-700/50 hover:bg-gray-700/30'}`}>
                <td className={`px-4 py-3 text-sm ${isClassic ? 'text-gray-800' : 'text-gray-200'}`}>{getWsName(c.workstation_id)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.result === 'pass' ? 'bg-green-100 text-green-800' : c.result === 'fail' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>{c.result}</span>
                </td>
                <td className={`px-4 py-3 text-sm ${isClassic ? 'text-gray-800' : 'text-gray-200'}`}>{c.defect_count}</td>
                <td className={`px-4 py-3 text-sm ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>{c.defect_type ?? '—'}</td>
                <td className={`px-4 py-3 text-sm ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(c.checked_at).toLocaleString()}</td>
              </tr>
            ))}
            {checks.length === 0 && (
              <tr>
                <td colSpan={5} className={`px-4 py-8 text-center text-sm ${isClassic ? 'text-gray-400' : 'text-gray-500'}`}>
                  No hay checks de calidad registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
