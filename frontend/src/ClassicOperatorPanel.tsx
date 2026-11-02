import { useState } from 'react';
import logo from '../../logo.png';
import { useOperatorPanel } from './hooks/useOperatorPanel.js';
import { useHmiStore } from './store/hmi-store.js';
import { FailedEventsModal } from './components/operator/FailedEventsModal.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { HelpModal } from './components/HelpModal.js';
import { IncidenciaModal } from './components/operator/IncidenciaModal.js';
import { PauseModal } from './components/operator/PauseModal.js';
import { OrderQueue } from './components/operator/OrderQueue.js';
import { OrderSummary } from './components/operator/OrderSummary.js';
import { QuickBlockForm } from './components/operator/QuickBlockForm.js';
import { suggestBlockStart } from './utils/quick-block.js';
import { ShiftClose } from './components/operator/ShiftClose.js';
import { orderLabel } from './utils/order-queue.js';
import { useOrderLogs } from './hooks/useOrderLogs.js';
import { summarizeOrder } from './utils/order-summary.js';
import { OPERATOR_HELP } from './help-content.js';
import { mapCustomFieldsToUI, type CustomFieldUI } from './utils/customFieldsMapper.js';
import { ordersEmptyState } from './utils/orders-empty-state.js';

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
    assignedWorkstationName,
    selectOrder, loadAvailableOrders,
    isFailedLogsModalOpen, setIsFailedLogsModalOpen,
    orderSearch, setOrderSearch,
    startTime, setStartTime, endTime, setEndTime,
    producedQuantity, setProducedQuantity,
    defectQuantity, setDefectQuantity,
    observations, setObservations, errorMsg, setErrorMsg,
    editingCustomFields, setEditingCustomFields,
    isSavingCustomFields,
    handleRegisterBlock, handleSaveCustomFields,
    schemaFields, customFields, filteredOrders,
  } = useOperatorPanel();
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isIncidenciaModalOpen, setIsIncidenciaModalOpen] = useState(false);
  const [showShift, setShowShift] = useState(false);

  const selectedOrder = useHmiStore((s) => s.selectedOrder);
  const { logs: orderLogs } = useOrderLogs(orderId ?? null);
  const summary = summarizeOrder(activeOrder ?? selectedOrder ?? { quantity: 0 }, orderLogs);

  const emptyState = ordersEmptyState(orderSearch, assignedWorkstationName);
  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' });

  const handleConfirmPause = async (reason: string) => {
    const now = new Date().toISOString();
    await useHmiStore.getState().registerWorkBlock(
      'parada',
      now,
      now,
      reason,
      0,
      0,
      null
    );
    setIsPauseModalOpen(false);
  };

  const handleResume = async () => {
    const now = new Date().toISOString();
    const oneMinuteLater = new Date(Date.now() + 60 * 1000).toISOString();
    await useHmiStore.getState().registerWorkBlock(
      'produccion',
      now,
      oneMinuteLater,
      null,
      0,
      0,
      null
    );
  };

  const handleOpenIncidenciaModal = () => setIsIncidenciaModalOpen(true);
  const handleCloseIncidenciaModal = () => setIsIncidenciaModalOpen(false);

  if (showShift) {
    const labelOf = (id: string) => {
      const o = availableOrders.find((x: { id: string }) => x.id === id);
      return orderLabel({ id, code: o?.code ?? null });
    };
    return (
      <ShiftClose
        variant="classic"
        operatorName={operatorName ?? null}
        workstationName={workstationName ?? null}
        dateLabel={new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' })}
        labelOf={labelOf}
        onBack={() => setShowShift(false)}
      />
    );
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-kavana-dark text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg bg-white p-1" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-kavana-orange-light">Kavana Manufacturing</p>
                <h1 className="text-lg font-semibold text-white">Seleccionar Orden</h1>
                <p className="text-xs text-gray-400">{operatorName} {workstationName ? `· ${workstationName}` : ''}</p>
              </div>
            </div>
            <ThemeToggle />
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
              <p className="text-lg font-medium text-slate-700">{emptyState.title}</p>
              <p className="mt-1 text-sm text-slate-500">{emptyState.description}</p>
            </div>
          ) : (
            <OrderQueue orders={filteredOrders} searching={orderSearch !== ''} variant="classic" onSelect={selectOrder} />
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setShowShift(true)} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Cerrar turno
            </button>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg bg-white p-1" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-kavana-orange-light">Kavana Manufacturing</p>
                <h1 className="text-lg font-semibold text-white">Panel de Operario</h1>
                <p className="text-xs text-gray-400">{dateLabel}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <span className="text-xs text-gray-400">Por enviar: {pendingCount}</span>
              <button
                onClick={() => setIsFailedLogsModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-gray-400 bg-kavana-surface/10 rounded hover:bg-kavana-surface/20"
              >
                Con error: {failedCount}
              </button>
              <button
                onClick={handleOpenIncidenciaModal}
                className="px-4 py-2 text-sm font-medium text-gray-400 bg-kavana-surface/10 rounded hover:bg-kavana-surface/20"
              >
                ⚠ Incidencia
              </button>
              <HelpModal {...OPERATOR_HELP} theme="classic" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[90%] px-4 py-6 sm:px-6 lg:px-8">
        <OrderSummary
          variant="classic"
          order={{ id: orderId, code: activeOrder?.code ?? selectedOrder?.code }}
          productName={selectedOrder?.model_name ?? null}
          workstationName={workstationName || null}
          operatorName={operatorName || null}
          summary={summary}
          busy={isMutating || isSyncing}
          onBack={() => useHmiStore.getState().leaveOrder()}
          onPause={() => setIsPauseModalOpen(true)}
          onResume={() => void handleResume()}
        />

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

        {/* Registro rápido */}
        <QuickBlockForm
          variant="classic"
          startTime={startTime}
          endTime={endTime}
          producedQuantity={producedQuantity}
          defectQuantity={defectQuantity}
          observations={observations}
          suggestedStart={suggestBlockStart(orderLogs)}
          workstationId={workstationId ?? null}
          busy={isMutating || isSyncing}
          onStartTime={setStartTime}
          onEndTime={setEndTime}
          onProduced={setProducedQuantity}
          onDefects={setDefectQuantity}
          onObservations={setObservations}
          onSubmit={handleRegisterBlock}
          />

      {isFailedLogsModalOpen && (
        <FailedEventsModal
          isOpen={isFailedLogsModalOpen}
          onClose={() => setIsFailedLogsModalOpen(false)}
          onClearAll={() => {
            useHmiStore.getState().setFailedCount(0);
          }}
        />
      )}
      <PauseModal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        onConfirm={handleConfirmPause}
      />
      <IncidenciaModal
        isOpen={isIncidenciaModalOpen}
        onClose={handleCloseIncidenciaModal}
        operatorId={operatorId}
        workstationId={workstationId}
        orderId={orderId}
        isClassic={true}
      />
    </main>
</div>
  );
}
