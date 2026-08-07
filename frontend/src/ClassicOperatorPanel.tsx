import { useState } from 'react';
import logo from '../../logo.png';
import { useOperatorPanel } from './hooks/useOperatorPanel.js';
import { useHmiStore } from './store/hmi-store.js';
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
    currentStatus, isOnline, isMutating, isSyncing,
    pendingCount, failedCount, capabilities,
    orderId, workstationId, operatorId, activeOrder,
    workstationName, operatorName,
    availableOrders, isLoadingOrders, activeOrderCustomFields,
    selectOrder, loadAvailableOrders,
    isFailedLogsModalOpen, setIsFailedLogsModalOpen,
    orderSearch, setOrderSearch,
    startTime, setStartTime, endTime, setEndTime,
    producedQuantity, setProducedQuantity,
    defectQuantity, setDefectQuantity,
    observations, setObservations, errorMsg, setErrorMsg,
    editingCustomFields, setEditingCustomFields,
    isSavingCustomFields,
    handleTimeChange, handleRegisterBlock, handleSaveCustomFields,
    schemaFields, customFields, filteredOrders,
  } = useOperatorPanel();
  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' });
  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-kavana-dark text-white shadow-md">
          <div className="px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg bg-white p-1" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-kavana-orange-light">Kavana Manufacturing HMI</p>
                <h1 className="text-lg font-semibold text-white">Seleccionar Orden</h1>
                <p className="text-xs text-gray-400">{operatorName} {workstationName ? `· ${workstationName}` : ''}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-[90%] px-4 py-6 sm:px-6 lg:px-8">
          <div className="relative mb-6">
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Buscar por modelo, puesto o código..."
              className="w-full rounded-lg border border-slate-300 bg-white p-3 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange focus:outline-none"
            />
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {isLoadingOrders ? (
            <div className="py-12 text-center text-slate-500">
              <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
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
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-kavana-orange hover:shadow-md"
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
                        : 'bg-orange-100 text-orange-700'
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-kavana-dark text-white shadow-md">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg bg-white p-1" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-kavana-orange-light">Kavana Manufacturing HMI</p>
                <h1 className="text-lg font-semibold text-white">Panel de Operario</h1>
                <p className="text-xs text-gray-400">{dateLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <span className="text-xs text-gray-400">Cola: {pendingCount}</span>
              <button
                onClick={() => setIsFailedLogsModalOpen(true)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Fallos: {failedCount}
              </button>
              <HelpModal {...OPERATOR_HELP} theme="classic" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[90%] px-4 py-6 sm:px-6 lg:px-8">
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

        {activeOrderCustomFields && Object.keys(activeOrderCustomFields).length > 0 && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Datos de la orden</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(activeOrderCustomFields).map(([key, value]) => (
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Hora Inicio</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => handleTimeChange(e.target.value, setStartTime)}
                  placeholder="HH:MM"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Hora Fin</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => handleTimeChange(e.target.value, setEndTime)}
                  placeholder="HH:MM"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Producción Buena</label>
                <input
                  type="number"
                  value={producedQuantity}
                  onChange={(e) => setProducedQuantity(e.target.value)}
                  min="0"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Defectos</label>
                <input
                  type="number"
                  value={defectQuantity}
                  onChange={(e) => setDefectQuantity(e.target.value)}
                  min="0"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Observaciones</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange resize-none"
              />
            </div>
            <div className="mt-4">
              <button
                type="submit"
                disabled={isMutating || isSyncing}
                className="inline-flex items-center gap-2 rounded-md bg-kavana-orange px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-kavana-orange-light focus:outline-none focus:ring-2 focus:ring-kavana-orange focus:ring-offset-2 disabled:opacity-50"
              >
                {isMutating ? 'Guardando...' : 'Registrar Producción'}
              </button>
            </div>
          </form>
        </div>

      {isFailedLogsModalOpen && (
        <FailedEventsModal
          isOpen={isFailedLogsModalOpen}
          onClose={() => setIsFailedLogsModalOpen(false)}
          onClearAll={() => {
            useHmiStore.getState().setFailedCount(0);
          }}
        />
      )}
    </main>
</div>
  );
}
