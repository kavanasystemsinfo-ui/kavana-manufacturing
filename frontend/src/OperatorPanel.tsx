import logo from '../../logo.png';
import { useHmiStore } from './store/hmi-store.js';
import { useOperatorPanel } from './hooks/useOperatorPanel.js';
import { ordersEmptyState } from './utils/orders-empty-state.js';
import { 
  useCapabilities, 
  useAvailableOrders, 
  useIsLoadingOrders, 
  useSelectedOrderCustomFields, 
  useActiveOrder, 
  useCurrentStatus, 
  useOperatorId, 
  useWorkstationId, 
  useIsOnline, 
  usePendingCount, 
  useFailedCount, 
  useIsMutating, 
  useIsSyncing, 
  useTenantId, 
  useUserId, 
  useRole,
  useSetCapabilities,
  useSetAvailableOrders,
  useSetIsLoadingOrders,
  useSetSelectedOrderCustomFields,
  useSetActiveOrder,
  useSetCurrentStatus,
  useSetOperatorId,
  useSetWorkstationId,
  useSetIsOnline,
  useSetPendingCount,
  useSetFailedCount,
  useSetIsMutating,
  useSetIsSyncing,
  useSetTenantId,
  useSetUserId,
  useSetRole,
} from './store/selectors.js';
import { FailedEventsModal } from './components/operator/FailedEventsModal.js';
import { IncidenciaModal } from './components/operator/IncidenciaModal.js'; // Note: we need to check the correct path
import { ShiftKpiCard } from './components/operator/ShiftKpiCard.js';
import { useMyShiftKPI } from './hooks/useMyShiftKPI.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { HelpModal } from './components/HelpModal.js';
import { AiAdvisorFab } from './components/AiAdvisorFab.js';
import { PauseModal } from './components/operator/PauseModal.js';
import { OrderQueue } from './components/operator/OrderQueue.js';
import { OrderSummary } from './components/operator/OrderSummary.js';
import { QuickBlockForm } from './components/operator/QuickBlockForm.js';
import { suggestBlockStart } from './utils/quick-block.js';
import { useOrderLogs } from './hooks/useOrderLogs.js';
import { summarizeOrder, type SummaryOrder } from './utils/order-summary.js';
import { OPERATOR_HELP } from './help-content.js';
import { useState } from 'react';
import { mapCustomFieldsToUI, type CustomFieldUI } from './utils/customFieldsMapper.js';
import { buildDraftValues } from './utils/custom-field-values.js';
import { CustomFieldsEditor } from './components/operator/CustomFieldsEditor.js';
import { Loading } from './components/ui/Loading.js';
import { EmptyState } from './components/ui/EmptyState.js';

export function OperatorPanel() {
  // Use selectors for state
  const capabilities = useCapabilities();
  const availableOrders = useAvailableOrders();
  const isLoadingOrders = useIsLoadingOrders();
  const selectedOrderCustomFields = useSelectedOrderCustomFields();
  const activeOrder = useActiveOrder();
  const currentStatus = useCurrentStatus();
  const operatorId = useOperatorId();
  const workstationId = useWorkstationId();
  const isOnline = useIsOnline();
  const pendingCount = usePendingCount();
  const failedCount = useFailedCount();
  const isMutating = useIsMutating();
  const isSyncing = useIsSyncing();
  const tenantId = useTenantId();
  const userId = useUserId();
  const role = useRole();

  // Use setter selectors for actions (if needed)
  const setCapabilities = useSetCapabilities();
  const setAvailableOrders = useSetAvailableOrders();
  const setIsLoadingOrders = useSetIsLoadingOrders();
  const setSelectedOrderCustomFields = useSetSelectedOrderCustomFields();
  const setActiveOrder = useSetActiveOrder();
  const setCurrentStatus = useSetCurrentStatus();
  const setOperatorId = useSetOperatorId();
  const setWorkstationId = useSetWorkstationId();
  const setIsOnline = useSetIsOnline();
  const setPendingCount = useSetPendingCount();
  const setFailedCount = useSetFailedCount();
  const setIsMutating = useSetIsMutating();
  const setIsSyncing = useSetIsSyncing();
  const setTenantId = useSetTenantId();
  const setUserId = useSetUserId();
  const setRole = useSetRole();

  // Use the hook for complex logic and handlers
  const {
    orderId,
    workstationName,
    operatorName,
    activeOrderCustomFields,
    availableOrders: hookAvailableOrders, // note: we already have from selector, but hook may have filtered
    isLoadingOrders: hookIsLoadingOrders,
    orderSearch,
    setOrderSearch,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    producedQuantity,
    setProducedQuantity,
    defectQuantity,
    setDefectQuantity,
    observations,
    setObservations,
    errorMsg,
    setErrorMsg,
    editingCustomFields,
    setEditingCustomFields,
    isSavingCustomFields,
    handleRegisterBlock,
    handleSaveCustomFields,
    schemaFields,
    customFields,
    filteredOrders,
    triggerSyncEngine,
    isFailedLogsModalOpen,
    setIsFailedLogsModalOpen,
    isIncidenciaModalOpen,
    setIsIncidenciaModalOpen,
    loadOrder,
    updateCustomFields,
    loadCapabilities,
    loadOperatorContext,
    assignedWorkstationName,
    loadAvailableOrders,
    selectOrder,
    registerWorkBlock,
    lastBlock,
    repeatLastBlock,
  } = useOperatorPanel();

  // Qué decir cuando no hay órdenes: si el problema es que no tiene puesto, el
  // mensaje tiene que decírselo a quien pueda arreglarlo.
  const emptyState = ordersEmptyState(orderSearch, assignedWorkstationName);
  const selectedOrder = useHmiStore((s) => s.selectedOrder);
  const { logs: orderLogs } = useOrderLogs(orderId ?? null);
  const summary = summarizeOrder((activeOrder ?? selectedOrder ?? {}) as SummaryOrder, orderLogs);

  const { kpi: shiftKpi, isLoading: isShiftKpiLoading, error: shiftKpiError, refresh: refreshShiftKpi } = useMyShiftKPI();

  const [isEditingFields, setIsEditingFields] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);

  const handleConfirmPause = async (reason: string) => {
    const now = new Date().toISOString();
    await registerWorkBlock(
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
    await registerWorkBlock(
      'produccion',
      now,
      oneMinuteLater,
      null,
      0,
      0,
      null
    );
  };

  // Note: We are using both selectors and hook. This may cause duplication but ensures we have both.
  // For simplicity, we could rely solely on the hook, but the goal was to demonstrate selectors.
  // We'll keep the selectors for state and the hook for actions and derived data.

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
            <Loading label="Cargando órdenes..." />
          ) : filteredOrders.length === 0 ? (
            <EmptyState title={emptyState.title} description={emptyState.description} />
          ) : (
            <OrderQueue orders={filteredOrders} searching={orderSearch !== ''} variant="kavana" onSelect={selectOrder} />
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
                className={`rounded-full px-4 py-3 text-sm font-bold ring-1 transition ${failedCount > 0
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
              <button
                onClick={() => setIsPauseModalOpen(true)}
                className="rounded-full bg-kavana-surface px-4 py-3 text-sm font-bold text-rose-500 ring-1 ring-rose-500/40 transition hover:bg-rose-500/30 hover:text-white"
              >
                Pausar
              </button>
              <button
                onClick={handleResume}
                className="rounded-full bg-kavana-surface px-4 py-3 text-sm font-bold text-emerald-500 ring-1 ring-emerald-500/40 transition hover:bg-emerald-500/30 hover:text-white"
              >
                Reanudar
              </button>
              <HelpModal {...OPERATOR_HELP} />
              <ThemeToggle />
            </div>
          </header>

          <OrderSummary
            variant="kavana"
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

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border-2 border-kavana-orange/40 bg-kavana-dark/70 p-5 shadow-inner flex flex-col justify-between">
              <div>
                {activeOrderCustomFields && Object.keys(activeOrderCustomFields).length > 0 && (
                  <div className="mt-4 rounded-xl border border-kavana-steel/20 bg-kavana-surface/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Datos de la orden</p>
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
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">{field.label}</label>
                      <p className="mt-1 text-sm font-medium text-white">
                        {String(activeOrderCustomFields?.[field.key] ?? '\\u2014')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {customFields.length > 0 && !isEditingFields && (
                <button
                  type="button"
                  onClick={() => {
                    // Se parte de lo que ya tiene la orden para editar sobre ello,
                    // no de un formulario en blanco.
                    setEditingCustomFields(buildDraftValues(schemaFields, activeOrderCustomFields));
                    setIsEditingFields(true);
                  }}
                  className="mt-3 rounded-lg border border-kavana-steel/30 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white"
                >
                  Rellenar campos de la orden
                </button>
              )}

              {customFields.length > 0 && isEditingFields && (
                <CustomFieldsEditor
                  fields={schemaFields}
                  values={editingCustomFields}
                  onChange={(key, value) => setEditingCustomFields((prev: Record<string, unknown>) => ({ ...prev, [key]: value }))}
                  onSave={async () => {
                    // Solo se cierra si se ha guardado: si falla, se queda abierto
                    // con lo que el operario había escrito.
                    const guardado = await handleSaveCustomFields();
                    if (guardado) setIsEditingFields(false);
                  }}
                  onCancel={() => setIsEditingFields(false)}
                  saving={isSavingCustomFields}
                />
              )}
            </div>
            {/* Right Column - Registration Form */}
            <div className="flex flex-col gap-6">
              <ShiftKpiCard
                kpi={shiftKpi}
                isLoading={isShiftKpiLoading}
                error={shiftKpiError}
                onRetry={() => void refreshShiftKpi()}
              />
              {errorMsg && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                  {errorMsg}
                </div>
              )}
              <QuickBlockForm
                variant="kavana"
                startTime={startTime}
                endTime={endTime}
                producedQuantity={producedQuantity}
                defectQuantity={defectQuantity}
                observations={observations}
                suggestedStart={suggestBlockStart(orderLogs)}
                busy={isMutating || isSyncing}
                onStartTime={setStartTime}
                onEndTime={setEndTime}
                onProduced={setProducedQuantity}
                onDefects={setDefectQuantity}
                onObservations={setObservations}
                onSubmit={handleRegisterBlock}
                onRepeat={lastBlock ? repeatLastBlock : null}
                />
            </div>
          </section>

          {isFailedLogsModalOpen && (
            <FailedEventsModal
              isOpen={isFailedLogsModalOpen}
              onClose={() => setIsFailedLogsModalOpen(false)}
              onClearAll={() => {
                // Use selector setter to reset failed count
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
      <PauseModal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        onConfirm={handleConfirmPause}
      />
    </>
  );
}

const onlineBadgeClass = (isOnline: boolean) => (
  isOnline
    ? 'rounded-full bg-emerald-500/20 px-4 py-3 text-sm font-black text-emerald-200 ring-1 ring-emerald-400/40'
    : 'rounded-full bg-kavana-orange/20 px-4 py-3 text-sm font-black text-kavana-orange ring-1 ring-kavana-orange/40'
);