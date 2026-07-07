import { useEffect, useState } from 'react';
import { useSupervisorStore } from './store/supervisor-store.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { ActivityFeed } from './components/ActivityFeed.js';
import { WorkstationBoard } from './components/WorkstationBoard.js';
import { HelpModal } from './components/HelpModal.js';
import { SUPERVISOR_HELP } from './help-content.js';

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

type Tab = 'orders' | 'workstations';

export function SupervisorPanel() {
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

  const handleToggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  return (
    <main className="min-h-screen bg-kavana-dark text-slate-100 p-4 md:p-8">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-kavana-steel/30 bg-kavana-panel/90 p-4 shadow-kavana-glow md:p-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-kavana-steel/30 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-kavana-orange-light">Kavana V3</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">Panel Supervisor</h1>
          </div>

          <div className="flex items-center gap-3">
            <HelpModal {...SUPERVISOR_HELP} />
            <button
              onClick={() => setShowForm(!showForm)}
              className="min-h-[64px] min-w-[64px] rounded-2xl bg-kavana-orange px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-kavana-orange-light active:scale-95"
            >
              {showForm ? 'Cancelar' : '+ Nueva Orden'}
            </button>
            <ThemeToggle />
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-500/20 p-4 text-rose-300 ring-1 ring-rose-500/40">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-kavana-steel/30 bg-kavana-surface/50 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Crear Nueva Orden</h2>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">Modelo de Fabricación</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-dark p-4 text-white min-h-[64px]"
                  required
                >
                  <option value="">Seleccionar modelo...</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit_of_measure})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">Puesto de Trabajo</label>
                <select
                  value={selectedWorkstation}
                  onChange={(e) => setSelectedWorkstation(e.target.value)}
                  className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-dark p-4 text-white min-h-[64px]"
                  required
                >
                  <option value="">Seleccionar puesto...</option>
                  {workstations.filter(w => w.status === 'active').map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">Cantidad</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-dark p-4 text-white min-h-[64px]"
                  placeholder="Ej: 100"
                  required
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">N. de Orden</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-dark p-4 text-white"
                  placeholder="Ej: ORD-2026-001"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">Medida</label>
                <input
                  type="text"
                  value={measurement}
                  onChange={(e) => setMeasurement(e.target.value)}
                  className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-dark p-4 text-white"
                  placeholder="Ej: 20x20mm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">Material</label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-dark p-4 text-white"
                  placeholder="Ej: Aluminio 6063"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">Notas</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-dark p-4 text-white"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 min-h-[64px] min-w-[64px] rounded-2xl bg-green-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Crear Orden'}
            </button>
          </form>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-kavana-surface/50 p-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition ${
              activeTab === 'orders'
                ? 'bg-kavana-orange text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Órdenes ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('workstations')}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition ${
              activeTab === 'workstations'
                ? 'bg-kavana-orange text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Puestos ({workstationStatus.length})
          </button>
        </div>

        {activeTab === 'orders' ? (
          isLoading && orders.length === 0 ? (
            <div className="rounded-xl bg-kavana-surface/50 p-8 text-center text-slate-400">
              Cargando órdenes...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl bg-kavana-surface/50 p-8 text-center text-slate-400">
              No hay órdenes creadas. Crea una nueva orden para comenzar.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const pct = order.quantity > 0 ? Math.min(100, Math.round((Number(order.produced_quantity) / order.quantity) * 100)) : 0;
                const isExpanded = expandedOrder === order.id;
                return (
                  <div key={order.id} className="rounded-xl border border-kavana-steel/20 bg-kavana-surface/40 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-bold text-white">{order.model_name}</h3>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusColors[order.status] ?? ''}`}>
                              {statusLabels[order.status] ?? order.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-400">
                            Puesto: {order.workstation_name} · Cant: {order.quantity}
                            {order.custom_fields?.numero_orden ? ` · N.Orden: ${order.custom_fields.numero_orden}` : ''}
                          </p>

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                              <span>Progreso</span>
                              <span>{Number(order.produced_quantity)} / {order.quantity} ({pct}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-kavana-dark overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-kavana-orange' : 'bg-slate-600'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {Number(order.defect_quantity) > 0 && (
                              <p className="mt-1 text-xs text-rose-400">Defectos: {order.defect_quantity}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => void changeOrderStatus(order.id, 'in_progress')}
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
                            >
                              Iniciar
                            </button>
                          )}
                          {order.status === 'in_progress' && (
                            <button
                              onClick={() => void changeOrderStatus(order.id, 'completed')}
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-500"
                            >
                              Completar
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleExpand(order.id)}
                            className="rounded-lg bg-kavana-dark px-4 py-2 text-sm font-bold text-slate-300 ring-1 ring-kavana-steel/40 hover:bg-kavana-steel/20"
                          >
                            {isExpanded ? 'Ocultar' : 'Actividad'}
                          </button>
                          <button
                            onClick={() => void removeOrder(order.id)}
                            className="rounded-lg bg-rose-600/20 px-4 py-2 text-sm font-bold text-rose-300 ring-1 ring-rose-500/40 hover:bg-rose-600/30"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Activity feed */}
                    {isExpanded && (
                      <div className="border-t border-kavana-steel/20 bg-kavana-dark/50 p-5">
                        <h4 className="text-sm font-bold text-slate-300 mb-3">Actividad de la orden</h4>
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
      </section>
    </main>
  );
}
