import { useSupervisorPanel } from './hooks/useSupervisorPanel.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { ActivityFeed } from './components/ActivityFeed.js';
import { WorkstationBoard } from './components/WorkstationBoard.js';
import { IncidenciasList } from './components/IncidenciasList.js';
import { HelpModal } from './components/HelpModal.js';
import { AiAdvisorFab } from './components/AiAdvisorFab.js';
import { SUPERVISOR_HELP } from './help-content.js';
import { formatQuantity } from './utils/formatNumber.js';

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

type Tab = 'orders' | 'workstations' | 'incidencias';

export function SupervisorPanel() {
  const {
    orders, models, workstations, workstationStatus, activity,
    isLoading, error, showForm, setShowForm, selectedModel, setSelectedModel,
    selectedWorkstation, setSelectedWorkstation, quantity, setQuantity,
    orderNumber, setOrderNumber, measurement, setMeasurement, material,
    setMaterial, notes, setNotes, activeTab, setActiveTab, expandedOrder,
    incidencias, incidenciasLoading, incidenciasError,
    handleSubmit, handleToggleExpand, changeOrderStatus, removeOrder,
    changeIncidenciaStatus, removeIncidencia, loadOrders,
  } = useSupervisorPanel();

  const model = models.find((m: any) => m.id === selectedModel);

  return (
    <>
      <main className="min-h-screen bg-kavana-dark text-slate-100 p-4 md:p-8">
      <section className="mx-auto w-[90%] rounded-[2rem] border-2 border-kavana-orange bg-kavana-panel/90 p-4 md:p-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-kavana-orange/30 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-kavana-orange-light">Kavana Manufacturing</p>
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
          <div className="mb-6 rounded-xl border-2 border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border-2 border-kavana-orange/30 bg-kavana-surface p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Modelo</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                >
                  <option value="">Seleccionar modelo...</option>
                  {models.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Puesto</label>
                <select
                  value={selectedWorkstation}
                  onChange={(e) => setSelectedWorkstation(e.target.value)}
                  className="w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                >
                  <option value="">Seleccionar puesto...</option>
                  {workstations.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Cantidad</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">N.º Orden</label>
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="OP-0000"
                  className="w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Medida</label>
                <input
                  value={measurement}
                  onChange={(e) => setMeasurement(e.target.value)}
                  placeholder="mm/cm"
                  className="w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Material</label>
                <input
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="..."
                  className="w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Notas</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="..."
                  className="w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-kavana-orange px-6 py-2.5 text-sm font-bold text-white transition hover:bg-kavana-orange-light active:scale-95"
                >
                  Crear orden
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg bg-kavana-steel/20 px-6 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-kavana-steel/40"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {(['orders', 'workstations', 'incidencias'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                activeTab === tab
                  ? 'bg-kavana-orange text-white shadow'
                  : 'bg-kavana-surface text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'orders' ? '📋 Órdenes' : tab === 'workstations' ? '🏭 Workstations' : '🚨 Incidencias'}
            </button>
          ))}
        </div>

        {isLoading && activeTab === 'orders' ? (
          <div className="py-16 text-center text-slate-400 animate-pulse">Cargando...</div>
        ) : activeTab === 'orders' ? (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="py-16 text-center text-slate-500">No hay órdenes. Crea la primera con + Nueva Orden.</div>
            ) : (
              orders.map((order: any) => (
                <div key={order.id} className="rounded-xl border-2 border-kavana-steel/20 bg-kavana-surface p-5 transition hover:border-kavana-steel/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${(statusColors as any)[order.status] || 'bg-slate-500/20 text-slate-300 ring-slate-500/40'}`}>
                        {(statusLabels as any)[order.status] || order.status}
                      </span>
                      <span className="text-lg font-bold text-white">{order.code || '—'}</span>
                      <span className="text-sm text-slate-400">{order.workstation_name || order.workstation_id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-300">{formatQuantity(order.quantity)} uds.</span>
                      <span className="text-slate-500">{order.model_name}</span>
                      <div className="flex gap-1">
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <>
                            <button onClick={() => changeOrderStatus(order.id, 'in_progress')} className="rounded-lg bg-blue-600/20 px-3 py-1 text-xs font-bold text-blue-300 hover:bg-blue-600/40">Iniciar</button>
                            <button onClick={() => changeOrderStatus(order.id, 'completed')} className="rounded-lg bg-green-600/20 px-3 py-1 text-xs font-bold text-green-300 hover:bg-green-600/40">Completar</button>
                          </>
                        )}
                        <button onClick={() => { if (confirm('¿Cancelar esta orden?')) changeOrderStatus(order.id, 'cancelled'); }} className="rounded-lg bg-red-600/20 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-600/40">✕</button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 border-t border-kavana-steel/10 pt-3">
                    <button onClick={() => handleToggleExpand(order.id)} className="text-xs font-bold text-kavana-orange-light hover:text-kavana-orange">
                      {expandedOrder === order.id ? '▲ Ocultar actividad' : '▼ Ver actividad'}
                    </button>
                    {expandedOrder === order.id && (
                      <div className="min-w-0 flex-1">
                        <ActivityFeed activity={activity} />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'workstations' ? (
          <WorkstationBoard workstations={workstations} />
        ) : (
          <IncidenciasList incidencias={incidencias} loading={incidenciasLoading} error={incidenciasError} onStatusChange={changeIncidenciaStatus} onDelete={removeIncidencia} />
        )}
      </section>
    </main>
    <AiAdvisorFab />
    </>
  );
}
