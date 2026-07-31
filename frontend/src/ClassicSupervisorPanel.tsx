import { useEffect, useState } from 'react';
import { useSupervisorStore } from './store/supervisor-store.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { ActivityFeed } from './components/ActivityFeed.js';
import { WorkstationBoard } from './components/WorkstationBoard.js';
import { HelpModal } from './components/HelpModal.js';
import { SUPERVISOR_HELP } from './help-content.js';
import { formatQuantity } from './utils/formatNumber.js';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

type Tab = 'orders' | 'workstations';

export function ClassicSupervisorPanel() {
  const {
    orders,
    models,
    workstations,
    workstationStatus,
    activity,
    isLoading,
    error,
    loadOrders,
    loadModels,
    loadWorkstations,
    loadWorkstationStatus,
    loadOrderActivity,
    addOrder,
    changeOrderStatus,
    removeOrder,
    startPolling,
    stopPolling,
  } = useSupervisorStore();

  const [showForm, setShowForm] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedWorkstation, setSelectedWorkstation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [measurement, setMeasurement] = useState('');
  const [material, setMaterial] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    void loadOrders();
    void loadModels();
    void loadWorkstations();
    void loadWorkstationStatus();
    startPolling();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (expandedOrder) {
      void loadOrderActivity(expandedOrder);
    }
  }, [expandedOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !selectedWorkstation || !quantity) return;

    await addOrder({
      model_id: selectedModel,
      workstation_id: selectedWorkstation,
      quantity: Number(quantity),
      custom_fields: {
        ...(orderNumber ? { numero_orden: orderNumber } : {}),
        ...(measurement ? { medida: measurement } : {}),
        ...(material ? { material } : {}),
        ...(notes ? { notas: notes } : {}),
      },
    });

    setSelectedModel('');
    setSelectedWorkstation('');
    setQuantity('');
    setOrderNumber('');
    setMeasurement('');
    setMaterial('');
    setNotes('');
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">KV</div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Panel de Supervisión</h1>
                <p className="text-xs text-slate-500">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HelpModal {...SUPERVISOR_HELP} theme="classic" />
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                {showForm ? 'Cancelar' : '+ Nueva Orden'}
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {showForm && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Nueva Orden de Producción</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Modelo</label>
                  <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" required>
                    <option value="">Seleccionar...</option>
                    {models.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.unit_of_measure})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Puesto</label>
                  <select value={selectedWorkstation} onChange={(e) => setSelectedWorkstation(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" required>
                    <option value="">Seleccionar...</option>
                    {workstations.filter(w => w.status === 'active').map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Cantidad</label>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ej: 100" required />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50">
                    {isLoading ? 'Creando...' : 'Crear'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">N. de Orden</label>
                  <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ej: ORD-2026-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Medida</label>
                  <input type="text" value={measurement} onChange={(e) => setMeasurement(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ej: 20x20mm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Material</label>
                  <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ej: Aluminio 6063" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Notas</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Notas..." />
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button onClick={() => setActiveTab('orders')} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Órdenes ({orders.length})
          </button>
          <button onClick={() => setActiveTab('workstations')} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'workstations' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Puestos ({workstationStatus.length})
          </button>
        </div>

        {activeTab === 'orders' ? (
          isLoading && orders.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">Cargando...</div>
          ) : orders.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">No hay órdenes</div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const pct = order.quantity > 0 ? Math.min(100, Math.round((Number(order.produced_quantity) / order.quantity) * 100)) : 0;
                const isExpanded = expandedOrder === order.id;
                return (
                  <div key={order.id} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{order.model_name}</h3>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[order.status] ?? ''}`}>
                              {statusLabels[order.status] ?? order.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            Puesto: {order.workstation_name} · Cant: {order.quantity}
                            {order.custom_fields?.numero_orden ? ` · N.Orden: ${order.custom_fields.numero_orden}` : ''}
                          </p>

                          {/* Progress bar */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                              <span>Progreso</span>
                              <span>{formatQuantity(order.produced_quantity)} / {formatQuantity(order.quantity)} ({pct}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-slate-200'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {Number(order.defect_quantity) > 0 && (
                              <p className="mt-1 text-xs text-red-600">Defectos: {formatQuantity(order.defect_quantity)}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {order.status === 'pending' && (
                            <button onClick={() => void changeOrderStatus(order.id, 'in_progress')} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Iniciar</button>
                          )}
                          {order.status === 'in_progress' && (
                            <button onClick={() => void changeOrderStatus(order.id, 'completed')} className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">Completar</button>
                          )}
                          <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            {isExpanded ? 'Ocultar' : 'Actividad'}
                          </button>
                          <button onClick={() => void removeOrder(order.id)} className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">Eliminar</button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Actividad de la orden</h4>
                        <ActivityFeed activity={activity} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <WorkstationBoard workstations={workstationStatus} />
        )}
      </main>
    </div>
  );
}
