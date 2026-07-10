import { useEffect, useState } from 'react';
import logo from '../../logo.png';
import { triggerSyncEngine, useHmiStore } from './store/hmi-store.js';
import { FailedEventsModal } from './components/operator/FailedEventsModal.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { HelpModal } from './components/HelpModal.js';
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
    currentStatus,
    isOnline,
    isMutating,
    isSyncing,
    pendingCount,
    failedCount,
    capabilities,
    orderId,
    workstationId,
    operatorId,
    activeOrder,
    registerWorkBlock,
    loadCapabilities,
    loadOperatorContext,
    loadAvailableOrders,
    selectOrder,
    loadOrder,
    updateCustomFields,
    workstationName,
    operatorName,
    availableOrders,
    isLoadingOrders,
    selectedOrderCustomFields,
  } = useHmiStore();
  
  const [isFailedLogsModalOpen, setIsFailedLogsModalOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  // Form State
  const [blockType, setBlockType] = useState<'produccion' | 'parada'>('produccion');
  
  // UX de Hora (HH:MM)
  const today = new Date();
  const dateLabel = today.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' });
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [producedQuantity, setProducedQuantity] = useState('');
  const [defectQuantity, setDefectQuantity] = useState('0');
  const [downtimeReason, setDowntimeReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingCustomFields, setEditingCustomFields] = useState<Record<string, any>>({});
  const [isSavingCustomFields, setIsSavingCustomFields] = useState(false);

  useEffect(() => {
    void loadOperatorContext();
    void loadCapabilities();
    void loadAvailableOrders();
    void triggerSyncEngine();
  }, []);

  useEffect(() => {
    if (orderId) {
      void loadOrder(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (activeOrder?.custom_fields) {
      setEditingCustomFields({ ...activeOrder.custom_fields });
    }
  }, [activeOrder?.custom_fields]);

  const handleTimeChange = (val: string, setter: (v: string) => void) => {
    let clean = val.replace(/[^\d:]/g, '');
    if (clean.length === 2 && !clean.includes(':') && val.length === 2) {
      clean += ':';
    } else if (clean.length > 2 && !clean.includes(':')) {
      clean = clean.slice(0, 2) + ':' + clean.slice(2);
    }
    if (clean.length > 5) clean = clean.slice(0, 5);
    setter(clean);
  };

  const parseTimeStr = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  async function handleRegisterBlock(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (startTime.length < 5 || endTime.length < 5) {
      setErrorMsg('Las horas deben tener formato HH:MM completo.');
      return;
    }

    const startD = parseTimeStr(startTime);
    const endD = parseTimeStr(endTime);
    
    // Si la hora de fin es menor numéricamente (ej: entra 22:00 sale 06:00), 
    // asumimos que pertenece al día siguiente.
    if (endD < startD) {
      endD.setDate(endD.getDate() + 1);
    }

    if (endD <= startD) {
      setErrorMsg('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    if (blockType === 'produccion' && (!producedQuantity || Number(producedQuantity) < 0)) {
      setErrorMsg('Debes introducir la cantidad producida.');
      return;
    }

    if (blockType === 'parada' && downtimeReason.trim().length === 0) {
      setErrorMsg('Debes introducir un motivo de parada.');
      return;
    }

    await registerWorkBlock(
      blockType,
      startD.toISOString(),
      endD.toISOString(),
      blockType === 'parada' ? downtimeReason : null,
      blockType === 'produccion' ? Number(producedQuantity) : undefined,
      blockType === 'produccion' ? Number(defectQuantity) : undefined
    );
    
    // Reset Form
    setStartTime('');
    setEndTime('');
    setProducedQuantity('');
    setDefectQuantity('0');
    setDowntimeReason('');
  }

  const handleSaveCustomFields = async () => {
    if (!orderId) return;
    setIsSavingCustomFields(true);
    try {
      await updateCustomFields(orderId, editingCustomFields);
    } finally {
      setIsSavingCustomFields(false);
    }
  };

  const activeOrderCustomFields = useHmiStore((state) => state.activeOrder?.custom_fields);

  const schemaFields = Array.isArray((capabilities?.customFieldsSchema as any)?.production_orders?.fields) 
    ? (capabilities?.customFieldsSchema as any).production_orders.fields 
    : [];

  const customFields = mapCustomFieldsToUI(activeOrderCustomFields, schemaFields);

  const filteredOrders = availableOrders.filter((o) => {
    const q = orderSearch.toLowerCase();
    if (!q) return true;
    return (
      o.model_name?.toLowerCase().includes(q) ||
      o.workstation_name?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  });

  if (!orderId) {
    return (
      <main className="min-h-screen bg-kavana-dark text-slate-100 p-4 md:p-8">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-kavana-steel/30 bg-kavana-panel/90 p-6 shadow-kavana-glow md:p-8">
          <header className="mb-6 flex items-center gap-4 border-b border-kavana-steel/30 pb-6">
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
    <main className="min-h-screen bg-kavana-dark text-slate-100 p-4 md:p-8">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-kavana-steel/30 bg-kavana-panel/90 p-4 shadow-kavana-glow md:p-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-kavana-steel/30 pb-6 md:flex-row md:items-center md:justify-between">
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
            <a
              href="/admin"
              className="rounded-full bg-kavana-orange/10 px-4 py-3 text-sm font-bold text-kavana-orange hover:bg-kavana-orange/20 ring-1 ring-kavana-orange/40 transition"
            >
              ⚙️ Admin
            </a>
            <HelpModal {...OPERATOR_HELP} />
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-kavana-steel/30 bg-kavana-dark/70 p-5 shadow-inner flex flex-col justify-between">
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

              {selectedOrderCustomFields && Object.keys(selectedOrderCustomFields).length > 0 && (
                <div className="mt-4 rounded-xl border border-kavana-steel/20 bg-kavana-surface/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-kavana-steel mb-3">Datos de la orden</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedOrderCustomFields).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-slate-400 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-medium text-white">{String(value ?? '—')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customFields.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {customFields.map((field) => (
                    <div key={field.key} className="rounded-xl border border-kavana-steel/20 bg-kavana-surface p-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-kavana-steel mb-1 block">{field.label}</label>
                      {field.type === 'boolean' ? (
                        <button
                          type="button"
                          onClick={() => setEditingCustomFields(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          className="flex items-center gap-2 mt-1"
                        >
                          {editingCustomFields[field.key] ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">✓</span>
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">✗</span>
                          )}
                          <span className="text-sm font-medium text-white">{editingCustomFields[field.key] ? 'Sí' : 'No'}</span>
                        </button>
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          value={editingCustomFields[field.key] ?? ''}
                          onChange={(e) => setEditingCustomFields(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                          className="w-full rounded-lg border-none bg-kavana-dark p-2 text-white text-sm font-medium ring-1 ring-kavana-steel/30 focus:ring-kavana-orange"
                        />
                      ) : (
                        <input
                          type="text"
                          value={editingCustomFields[field.key] ?? ''}
                          onChange={(e) => setEditingCustomFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full rounded-lg border-none bg-kavana-dark p-2 text-white text-sm font-medium ring-1 ring-kavana-steel/30 focus:ring-kavana-orange"
                        />
                      )}
                    </div>
                  ))}
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveCustomFields}
                      disabled={isSavingCustomFields || !isOnline}
                      className="rounded-lg bg-kavana-orange/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-kavana-orange ring-1 ring-kavana-orange/30 transition hover:bg-kavana-orange/30 disabled:opacity-50"
                    >
                      {isSavingCustomFields ? 'Guardando...' : 'Guardar Campos'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-kavana-orange/20 bg-gradient-to-br from-kavana-orange/20 to-kavana-orange-light/10 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-kavana-orange-light">Estado Global</p>
              <p className="mt-2 text-5xl font-black text-white md:text-6xl">{statusLabel[currentStatus] || currentStatus}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-kavana-steel/30 bg-kavana-surface p-5 shadow-lg">
            <h3 className="text-xl font-black uppercase text-white mb-6">Registrar Parte de Trabajo</h3>
            
            <form onSubmit={handleRegisterBlock} className="space-y-5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBlockType('produccion')}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold uppercase transition ${blockType === 'produccion' ? 'bg-kavana-orange text-kavana-dark' : 'bg-kavana-dark text-kavana-steel border border-kavana-steel/30'}`}
                >
                  Producción
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType('parada')}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold uppercase transition ${blockType === 'parada' ? 'bg-rose-500 text-white' : 'bg-kavana-dark text-kavana-steel border border-kavana-steel/30'}`}
                >
                  Parada
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-2">
                    Inicio <span className="lowercase text-slate-500 tracking-normal ml-1">({dateLabel})</span>
                  </label>
                  <input
                    type="text"
                    placeholder="08:00"
                    value={startTime}
                    onChange={(e) => handleTimeChange(e.target.value, setStartTime)}
                    className="w-full rounded-xl border-none bg-kavana-dark p-3 text-white text-xl font-bold ring-1 ring-kavana-steel/40 focus:ring-kavana-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-2">
                    Fin <span className="lowercase text-slate-500 tracking-normal ml-1">({dateLabel})</span>
                  </label>
                  <input
                    type="text"
                    placeholder="14:00"
                    value={endTime}
                    onChange={(e) => handleTimeChange(e.target.value, setEndTime)}
                    className="w-full rounded-xl border-none bg-kavana-dark p-3 text-white text-xl font-bold ring-1 ring-kavana-steel/40 focus:ring-kavana-orange"
                  />
                </div>
              </div>

              {blockType === 'produccion' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-2">Piezas Producidas</label>
                    <input
                      type="number"
                      min="0"
                      value={producedQuantity}
                      onChange={(e) => setProducedQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border-none bg-kavana-dark p-3 text-white text-xl font-bold ring-1 ring-kavana-steel/40 focus:ring-kavana-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-2">Mermas (Defectos)</label>
                    <input
                      type="number"
                      min="0"
                      value={defectQuantity}
                      onChange={(e) => setDefectQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border-none bg-kavana-dark p-3 text-white text-xl font-bold ring-1 ring-kavana-steel/40 focus:ring-kavana-orange"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-kavana-steel mb-2">Motivo de Parada</label>
                  <input
                    type="text"
                    value={downtimeReason}
                    onChange={(e) => setDowntimeReason(e.target.value)}
                    placeholder="Ej. Avería máquina, Cambio utillaje..."
                    className="w-full rounded-xl border-none bg-kavana-dark p-3 text-white ring-1 ring-kavana-steel/40 focus:ring-kavana-orange"
                  />
                </div>
              )}

              {errorMsg && (
                <p className="rounded-lg bg-rose-500/20 p-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isMutating || isSyncing || !orderId || !workstationId || !operatorId}
                className="w-full rounded-xl bg-kavana-orange-light py-4 text-lg font-black uppercase text-kavana-dark shadow-lg transition hover:bg-orange-300 active:scale-[0.98] disabled:opacity-50"
              >
                {isMutating ? 'Guardando...' : !orderId ? 'Cargando contexto...' : 'Guardar Parte'}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-kavana-steel/20 bg-kavana-dark/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-kavana-steel">Resiliencia offline</p>
              <p className="mt-2 text-xs text-slate-400">
                El parte se guardará de forma segura en tu dispositivo si no hay conexión a internet y se enviará en cuanto la recuperes.
              </p>
            </div>
          </div>
        </section>
      </section>

      <FailedEventsModal
        isOpen={isFailedLogsModalOpen}
        onClose={() => setIsFailedLogsModalOpen(false)}
        onClearAll={() => {
           useHmiStore.getState().setFailedCount(0);
        }}
      />
    </main>
  );
}

function onlineBadgeClass(isOnline: boolean) {
  return isOnline
    ? 'rounded-full bg-emerald-500/20 px-4 py-3 text-sm font-black text-emerald-200 ring-1 ring-emerald-400/40'
    : 'rounded-full bg-kavana-orange/20 px-4 py-3 text-sm font-black text-kavana-orange-light ring-1 ring-kavana-orange/40';
}
