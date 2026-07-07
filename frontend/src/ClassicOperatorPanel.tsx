import { useEffect, useState } from 'react';
import logo from '../../logo.png';
import { triggerSyncEngine, useHmiStore } from './store/hmi-store.js';
import { FailedEventsModal } from './components/operator/FailedEventsModal.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { HelpModal } from './components/HelpModal.js';
import { OPERATOR_HELP } from './help-content.js';
import { mapCustomFieldsToUI, type CustomFieldUI } from './utils/customFieldsMapper.js';

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_produccion: 'En Producción',
  completada: 'Completada',
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export function ClassicOperatorPanel() {
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

  const [blockType, setBlockType] = useState<'produccion' | 'parada'>('produccion');
  
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
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Seleccionar Orden</h1>
                <p className="text-xs text-slate-500">{operatorName} {workstationName ? `· ${workstationName}` : ''}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="relative mb-6">
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Buscar por modelo, puesto o código..."
              className="w-full rounded-lg border border-slate-300 bg-white p-3 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {isLoadingOrders ? (
            <div className="py-12 text-center text-slate-500">
              <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Cargando órdenes...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-medium text-slate-700">Sin órdenes disponibles</p>
              <p className="mt-1 text-sm text-slate-500">
                {orderSearch ? 'No se encontraron órdenes con ese criterio' : 'No hay órdenes asignadas a tu puesto'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => selectOrder(order)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{order.model_name ?? 'Sin modelo'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {order.workstation_name ?? 'Sin puesto'} · Cant: {order.quantity}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      order.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <ThemeToggle />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Panel de Operario</h1>
                <p className="text-xs text-slate-500">{dateLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <span className="text-xs text-slate-500">Cola: {pendingCount}</span>
              <button
                onClick={() => setIsFailedLogsModalOpen(true)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Fallos: {failedCount}
              </button>
              <HelpModal {...OPERATOR_HELP} theme="classic" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Estado actual */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Estado</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{statusLabels[currentStatus] ?? currentStatus}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Orden</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{orderId ?? 'N/A'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Puesto</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{workstationName || workstationId || 'N/A'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Operario</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{operatorName || operatorId || 'N/A'}</p>
          </div>
        </div>

        {selectedOrderCustomFields && Object.keys(selectedOrderCustomFields).length > 0 && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Datos de la orden</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(selectedOrderCustomFields).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-slate-400 capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-medium text-slate-900">{String(value ?? '—')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Formulario de registro */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Registrar Bloque de Tiempo</h2>
          </div>
          <form onSubmit={handleRegisterBlock} className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tipo</label>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value as 'produccion' | 'parada')}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="produccion">Producción</option>
                  <option value="parada">Parada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Hora Inicio</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => handleTimeChange(e.target.value, setStartTime)}
                  placeholder="HH:MM"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Hora Fin</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => handleTimeChange(e.target.value, setEndTime)}
                  placeholder="HH:MM"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {blockType === 'produccion' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Producidos</label>
                    <input
                      type="number"
                      value={producedQuantity}
                      onChange={(e) => setProducedQuantity(e.target.value)}
                      min="0"
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Defectos</label>
                    <input
                      type="number"
                      value={defectQuantity}
                      onChange={(e) => setDefectQuantity(e.target.value)}
                      min="0"
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Motivo de Parada</label>
                  <input
                    type="text"
                    value={downtimeReason}
                    onChange={(e) => setDowntimeReason(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            <div className="mt-4">
              <button
                type="submit"
                disabled={isMutating || isSyncing}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isMutating ? 'Guardando...' : 'Registrar Bloque'}
              </button>
            </div>
          </form>
        </div>

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Campos Personalizados</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {customFields.map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                    {field.type === 'boolean' ? (
                      <button
                        type="button"
                        onClick={() => setEditingCustomFields(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="mt-1 flex items-center gap-2"
                      >
                        {editingCustomFields[field.key] ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Sí</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">No</span>
                        )}
                      </button>
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={editingCustomFields[field.key] ?? ''}
                        onChange={(e) => setEditingCustomFields(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editingCustomFields[field.key] ?? ''}
                        onChange={(e) => setEditingCustomFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCustomFields}
                  disabled={isSavingCustomFields || !isOnline}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSavingCustomFields ? 'Guardando...' : 'Guardar Campos'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <FailedEventsModal
        isOpen={isFailedLogsModalOpen}
        onClose={() => setIsFailedLogsModalOpen(false)}
        onClearAll={() => {
          useHmiStore.getState().setFailedCount(0);
        }}
      />
    </div>
  );
}
