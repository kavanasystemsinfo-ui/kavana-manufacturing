
import logo from '../../logo.png';
import { useOperatorPanel } from './hooks/useOperatorPanel.js';
import { useHmiStore } from './store/hmi-store.js';
import { FailedEventsModal } from './components/operator/FailedEventsModal.js';
import { IncidenciaModal } from './components/operator/IncidenciaModal.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { HelpModal } from './components/HelpModal.js';
import { AiAdvisorFab } from './components/AiAdvisorFab.js';
import { OPERATOR_HELP } from './help-content.js';
import { mapCustomFieldsToUI, type CustomFieldUI } from './utils/customFieldsMapper.js';

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  pendiente: 'Pendiente',
  en_produccion: 'En Producción',
  completada: 'Completada',
};

export function OperatorPanel() {
  const {
    currentStatus, isOnline, isMutating, isSyncing,
    pendingCount, failedCount, capabilities,
    orderId, workstationId, operatorId, activeOrder,
    workstationName, operatorName,
    availableOrders, isLoadingOrders, activeOrderCustomFields,
    selectOrder, loadAvailableOrders,
    isFailedLogsModalOpen, setIsFailedLogsModalOpen,
    isIncidenciaModalOpen, setIsIncidenciaModalOpen,
    orderSearch, setOrderSearch,
    startTime, setStartTime, endTime, setEndTime,
    producedQuantity, setProducedQuantity,
    defectQuantity, setDefectQuantity,
    observations, setObservations, errorMsg, setErrorMsg,
    editingCustomFields, setEditingCustomFields,
    isSavingCustomFields,
    handleTimeChange, handleRegisterBlock, handleSaveCustomFields,
    schemaFields, customFields, filteredOrders, triggerSyncEngine,
  } = useOperatorPanel();

  if (!orderId) {
    return (
      <main className="min-h-screen bg-kavana-dark text-slate-100 p-4 md:p-8">
        <section className="mx-auto w-[90%] rounded-[2rem] border-2 border-kavana-orange bg-kavana-panel/90 p-6 md:p-8">
          <header className="mb-6 flex items-center gap-4 border-b border-kavana-orange/30 pb-6">
            <img src={logo} alt="Logo Kavana" className="h-14 w-14 rounded-2xl bg-kavana-surface object-cover p-2 ring-1 ring-kavana-orange/40" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.32em] text-kavana-orange-light">Kavana Manufacturing HMI</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">Seleccionar Orden</h1>
            </div>
          </header>

          <div className="mb-6 flex items-center gap-3">
            <p className="text-sm text-slate-400">
              {operatorName ? `Operario: ${operatorName}` : ''} {workstationName ? `· Puesto: ${workstationName}` : ''}
            </p>
          </div>

          <div className="relative mb-6">
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Buscar por modelo, puesto o código..."
              className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-dark p-4 pl-12 text-white placeholder-slate-500 ring-1 ring-kavana-steel/20 focus:ring-kavana-orange/60 focus:outline-none text-lg"
            />
            <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {isLoadingOrders ? (
            <div className="py-12 text-center text-slate-400">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-kavana-orange border-t-transparent" />
              Cargando órdenes...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-bold text-slate-300">Sin órdenes disponibles</p>
              <p className="mt-2 text-sm text-slate-500">
                {orderSearch ? 'No se encontraron órdenes con ese criterio' : 'No hay órdenes asignadas a tu puesto'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => selectOrder(order)}
                  className="w-full rounded-xl border border-kavana-steel/20 bg-kavana-surface/60 p-5 text-left transition hover:border-kavana-orange/40 hover:bg-kavana-surface hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-white">{order.model_name ?? 'Sin modelo'}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {order.workstation_name ?? 'Sin puesto'} · Cant: {order.quantity}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      order.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40'
                    }`}>
                      {statusLabel[order.status] ?? order.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <ThemeToggle />
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-kavana-dark text-slate-100 p-4 md:p-8">
      <section className="mx-auto w-[90%] rounded-[2rem] border-2 border-kavana-orange bg-kavana-panel/90 p-4 md:p-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-kavana-orange/30 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Logo Kavana"
              className="h-16 w-16 rounded-2xl bg-kavana-surface object-cover p-2 ring-1 ring-kavana-orange/40"
            />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.32em] text-kavana-orange-light">Kavana Manufacturing HMI</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">Panel de Operario</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className={onlineBadgeClass(isOnline)}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="rounded-full bg-kavana-surface px-4 py-3 text-sm font-bold text-slate-100 ring-1 ring-kavana-steel/40">
              Cola pendiente: {pendingCount}
            </span>
            <button
              onClick={() => setIsFailedLogsModalOpen(true)}
              className={`rounded-full px-4 py-3 text-sm font-bold ring-1 transition ${
                failedCount > 0
                  ? 'bg-rose-500/20 text-rose-300 ring-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-kavana-surface text-slate-100 ring-kavana-steel/40 hover:bg-kavana-steel/20'
              }`}
            >
              Fallos: {failedCount}
            </button>
            <button
              onClick={() => setIsIncidenciaModalOpen(true)}
              className="rounded-full bg-kavana-surface px-4 py-3 text-sm font-bold text-kavana-orange ring-1 ring-kavana-orange/40 transition hover:bg-kavana-orange hover:text-white"
            >
              ⚠ Incidencia
            </button>
            <HelpModal {...OPERATOR_HELP} />
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border-2 border-kavana-orange/40 bg-kavana-dark/70 p-5 shadow-inner flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-kavana-steel">Orden actual</p>
              <h2 className="mt-3 text-2xl font-black text-white md:text-4xl">
                {activeOrder?.code || (orderId ? `OF-${orderId.slice(0, 8)}` : 'Sin orden asignada')}
              </h2>
              <p className="mt-3 text-slate-300">
                {workstationName || (workstationId ? `Puesto: ${workstationId.slice(0, 8)}` : 'Puesto: No asignado')}
                {' · '}
                {operatorName || (operatorId ? `Operario: ${operatorId.slice(0, 8)}` : 'Operario: No asignado')}
              </p>

              {activeOrderCustomFields && Object.keys(activeOrderCustomFields).length > 0 && (
                <div className="mt-4 rounded-xl border border-kavana-steel/20 bg-kavana-surface/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-kavana-steel mb-3">Datos de la orden</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(activeOrderCustomFields).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-slate-400 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-medium text-white">{String(value ?? '—')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
            {customFields.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                {customFields.map((field) => (
                  <div key={field.key} className="rounded-xl border border-kavana-steel/20 bg-kavana-surface p-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-kavana-steel mb-1 block">{field.label}</label>
                    <p className="mt-1 text-sm font-medium text-white">
                      {String(activeOrderCustomFields?.[field.key] ?? '\u2014')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Registration Form */}
          <div className="flex flex-col gap-6">
            {errorMsg && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                {errorMsg}
              </div>
            )}

            <div className="rounded-2xl border-2 border-kavana-orange/40 bg-kavana-dark/70 p-5 shadow-inner">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-kavana-steel mb-4">Registrar Bloque de Tiempo</p>
              <form onSubmit={handleRegisterBlock} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-1">Hora Inicio</label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => handleTimeChange(e.target.value, setStartTime)}
                      placeholder="HH:MM"
                      className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:border-kavana-orange focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-1">Hora Fin</label>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => handleTimeChange(e.target.value, setEndTime)}
                      placeholder="HH:MM"
                      className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:border-kavana-orange focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-1">Producción Buena</label>
                    <input
                      type="number"
                      value={producedQuantity}
                      onChange={(e) => setProducedQuantity(e.target.value)}
                      min="0"
                      className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-sm font-medium text-white focus:border-kavana-orange focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-1">Defectos</label>
                    <input
                      type="number"
                      value={defectQuantity}
                      onChange={(e) => setDefectQuantity(e.target.value)}
                      min="0"
                      className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-sm font-medium text-white focus:border-kavana-orange focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-1">Observaciones</label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:border-kavana-orange focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isMutating || isSyncing}
                  className="mt-2 w-full rounded-xl bg-kavana-orange px-6 py-4 text-base font-black uppercase tracking-wider text-white transition hover:bg-kavana-orange-light disabled:opacity-50"
                >
                  {isMutating ? 'Guardando...' : 'Registrar Producción'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {isFailedLogsModalOpen && (
          <FailedEventsModal
            isOpen={isFailedLogsModalOpen}
            onClose={() => setIsFailedLogsModalOpen(false)}
            onClearAll={() => {
              useHmiStore.getState().setFailedCount(0);
            }}
          />
        )}
        <IncidenciaModal
          isOpen={isIncidenciaModalOpen}
          onClose={(created) => {
            setIsIncidenciaModalOpen(false);
            if (created) void loadAvailableOrders();
          }}
          operatorId={operatorId}
          workstationId={workstationId}
          orderId={orderId}
        />
      </section>
    </main>
    <AiAdvisorFab />
    </>
  );
}

const onlineBadgeClass = (isOnline: boolean) => (
  isOnline
    ? 'rounded-full bg-emerald-500/20 px-4 py-3 text-sm font-black text-emerald-200 ring-1 ring-emerald-400/40'
    : 'rounded-full bg-kavana-orange/20 px-4 py-3 text-sm font-black text-kavana-orange ring-1 ring-kavana-orange/40'
);

