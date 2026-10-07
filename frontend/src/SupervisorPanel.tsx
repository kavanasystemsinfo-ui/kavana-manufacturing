import { useState } from 'react';
import { useSupervisorPanel } from './hooks/useSupervisorPanel.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { ActivityFeed } from './components/ActivityFeed.js';
import { WorkstationBoard } from './components/WorkstationBoard.js';
import { HelpModal } from './components/HelpModal.js';
import { AiAdvisorFab } from './components/AiAdvisorFab.js';
import { SUPERVISOR_HELP } from './help-content.js';
import { Loading } from './components/ui/Loading.js';
import { EmptyState } from './components/ui/EmptyState.js';
import { ErrorState } from './components/ui/ErrorState.js';
import { IncidenciasKanban } from './components/incidencias/IncidenciasKanban.js';
import { ResumenTab } from './components/ResumenTab.js';
import { LiveLineTab } from './components/LiveLineTab.js';
import { OeeAdvancedTab } from './components/OeeAdvancedTab.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { OrdersTable } from './components/supervisor/OrdersTable.js';
import { OrderFiltersBar, type OrdersView } from './components/supervisor/OrderFiltersBar.js';
import { BUTTON_SECONDARY, NOTICE_INFO, themed } from './utils/ui-tokens.js';
import { useTour, TourStep } from './components/Tour.js';

type Tab = 'resumen' | 'live' | 'oee' | 'orders' | 'workstations' | 'incidencias';

/**
 * Panel de supervisión, tema Kavana.
 * 
 * Comparte con el tema clásico la barra de filtros, la tabla y el tablero: entre
 * temas cambia el color y el reparto del espacio, nunca las acciones disponibles
 * ni los datos que se pueden consultar.
 */
export function SupervisorPanel() {
  const {
    orders, models, workstations, workstationStatus, activity,
    isLoading, error, showForm, setShowForm, selectedModel, setSelectedModel,
    selectedWorkstation, setSelectedWorkstation, quantity, setQuantity,
    orderNumber, setOrderNumber, measurement, setMeasurement, material,
    setMaterial, notes, setNotes, activeTab, setActiveTab, expandedOrder,
    incidencias, incidenciasLoading, incidenciasError, incidenciaNotice,
    filters, setFilters, hasMore, loadMoreOrders, orderNotice,
    handleSubmit, handleToggleExpand, changeOrderStatus, removeOrder,
    changeIncidenciaStatus, removeIncidencia,
  } = useSupervisorPanel();

  // El tablero es la vista natural de este tema.
  const [view, setView] = useState<OrdersView>('tablero');

  // Tour steps definition - granular por campo/gráfica
  const tourSteps: TourStep[] = [
    {
      id: 'header-title',
      selector: 'h1',
      title: 'Panel Supervisor',
      content: 'Cabecera principal con título del panel. Aquí ves en qué módulo estás.',
      position: 'bottom',
    },
    {
      id: 'header-new-order',
      selector: 'button:has-text("+ Nueva Orden")',
      title: 'Crear orden',
      content: 'Botón "+ Nueva Orden": abre el formulario para crear una nueva orden de producción (modelo, puesto, cantidad, medidas, material, notas).',
      position: 'bottom',
    },
    {
      id: 'header-help',
      selector: 'button:has-text("Ayuda"), button[aria-label*="Ayuda"]',
      title: 'Ayuda contextual',
      content: 'Botón "Ayuda" (?): abre guías contextuales específicas del panel de supervisor.',
      position: 'bottom',
    },
    {
      id: 'header-tour',
      selector: 'button:has-text("Tour")',
      title: 'Tour guiado',
      content: 'Botón "🎯 Tour": inicia este recorrido guiado. Siempre visible, puedes repetirlo cuando quieras.',
      position: 'bottom',
    },
    {
      id: 'header-theme',
      selector: 'button[aria-label*="Tema"], button[aria-label*="theme"]',
      title: 'Cambio de tema',
      content: 'Toggle Clásico/Kavana: cambia entre el tema clásico (claro, denso) y el tema Kavana (oscuro, espacioso). Los datos y acciones son idénticos.',
      position: 'bottom',
    },
    {
      id: 'tabs',
      selector: '[class*="overflow-x-auto"]',
      title: '6 Pestañas principales',
      content: 'RESUMEN: KPIs y alertas. LÍNEA EN VIVO: timeline turno 8h. OEE AVANZADO: métricas OEE y 6 Grandes Pérdidas. ÓRDENES: tabla/Kanban. PUESTOS: grid semáforo. INCIDENCIAS: Kanban 4 columnas.',
      position: 'bottom',
    },
    {
      id: 'resumen-kpis',
      selector: '[class*="grid"] > [class*="rounded"]:first-child',
      title: 'KPIs de órdenes',
      content: 'Tarjetas KPI: Órdenes totales, En progreso, Completadas hoy, Pendientes. Se actualizan en tiempo real.',
      position: 'top',
      action: () => { /* already on resumen tab */ },
    },
    {
      id: 'resumen-production-chart',
      selector: 'canvas, [class*="ProductionChart"]',
      title: 'Producción diaria',
      content: 'Gráfica de barras: producción por día (últimos 7-30 días). Hover para ver detalle exacto por día.',
      position: 'top',
    },
    {
      id: 'resumen-pareto',
      selector: '[class*="DowntimePareto"]',
      title: 'Pareto de paradas',
      content: 'Gráfica Pareto: top motivos de parada ordenados por frecuencia, con curva acumulada. Identifica el 20% de causas que generan el 80% de paradas.',
      position: 'top',
    },
    {
      id: 'resumen-performance',
      selector: '[class*="Rendimiento"]',
      title: 'Rendimiento del día',
      content: 'Barra de progreso: % de producción real vs objetivo del día. Verde = objetivo cumplido, ámbar = cerca, rojo = por debajo.',
      position: 'top',
    },
    {
      id: 'resumen-orders-state',
      selector: '[class*="Órdenes por estado"]',
      title: 'Órdenes por estado',
      content: 'Distribución visual: Pendientes, En progreso, Completadas, Canceladas. Click para filtrar en tab ÓRDENES.',
      position: 'top',
    },
    {
      id: 'resumen-oee-trend',
      selector: '[class*="Tendencia OEE"]',
      title: 'Tendencia OEE semanal',
      content: 'Línea temporal: OEE diario de la última semana. Detecta caídas y tendencias.',
      position: 'top',
    },
    {
      id: 'alerts-stopped',
      selector: '[class*="Puesto detenido"]',
      title: 'Alerta: Puesto detenido',
      content: 'Puestos en estado "stopped" > 4h sin actividad. Rojo = crítico. "Ver todas" lista completa.',
      position: 'left',
    },
    {
      id: 'alerts-quality',
      selector: '[class*="Problemas calidad"]',
      title: 'Alerta: Problemas calidad',
      content: 'Órdenes con defectos > umbral. Ámbar = atención. "Revisar pendientes" salta a tab INCIDENCIAS filtrado por calidad.',
      position: 'left',
    },
    {
      id: 'alerts-maintenance',
      selector: '[class*="Mantenimiento"]',
      title: 'Alerta: Mantenimiento',
      content: 'Puestos con mantenimiento programado o vencido. Azul = info. Requiere módulo CMMS (pendiente).',
      position: 'left',
    },
    {
      id: 'alerts-stock',
      selector: '[class*="Stock crítico"]',
      title: 'Alerta: Stock crítico',
      content: 'Referencias con stock actual < stock mínimo. Verde = dato real desde BD. "Ver todas" abre vista completa de materiales.',
      position: 'left',
    },
    {
      id: 'actions-report',
      selector: 'button:has-text("Ver reporte")',
      title: 'Acción: Ver reporte',
      content: 'Genera reporte de producción (PDF/Excel). Deshabilitado: requiere módulo reportes pendiente. Tooltip honesto.',
      position: 'left',
    },
    {
      id: 'actions-maintenance',
      selector: 'button:has-text("Programar mantenimiento")',
      title: 'Acción: Programar mantenimiento',
      content: 'Crea orden de mantenimiento preventivo/correctivo. Deshabilitado: requiere CMMS pendiente.',
      position: 'left',
    },
    {
      id: 'actions-review',
      selector: 'button:has-text("Revisar pendientes")',
      title: 'Acción: Revisar pendientes',
      content: 'Navega directo a tab INCIDENCIAS filtrado por "abierto/en_progreso". Funciona ya.',
      position: 'left',
    },
    {
      id: 'live-tab',
      selector: 'button:has-text("LÍNEA EN VIVO")',
      title: 'Línea en vivo',
      content: 'Timeline de 8h por puesto. Estados running/stopped/idle con bloques de producción y paradas. Scroll horizontal para turno completo.',
      position: 'bottom',
    },
    {
      id: 'oee-tab',
      selector: 'button:has-text("OEE AVANZADO")',
      title: 'OEE Avanzado',
      content: 'Medias de planta, tendencia Día/Semana/Mes (cambia endpoint), ranking puestos, tabla detalle, 6 Grandes Pérdidas (modelado proporcional documentado).',
      position: 'bottom',
    },
    {
      id: 'orders-tab',
      selector: 'button:has-text("ÓRDENES")',
      title: 'Órdenes',
      content: 'Filtros servidor, paginación, Kanban drag&drop para cambiar estado, tabla alternativa, detalle expandible con actividad.',
      position: 'bottom',
    },
    {
      id: 'workstations-tab',
      selector: 'button:has-text("PUESTOS")',
      title: 'Puestos',
      content: 'Grid de puestos con semáforo running/stopped/idle, operador asignado, última actividad. Click para ver detalle.',
      position: 'bottom',
    },
    {
      id: 'incidencias-tab',
      selector: 'button:has-text("INCIDENCIAS")',
      title: 'Incidencias',
      content: 'Kanban 4 columnas (abierto/en_progreso/resuelto/cerrado), drag&drop, tipos: calidad/mantenimiento/seguridad/otros. Filtros y búsqueda.',
      position: 'bottom',
    },
  ];

  const { isOpen: tourOpen, completed: tourCompleted, start: startTour, close: closeTour, complete: completeTour, TourComponent } = useTour(tourSteps);

  return (
    <>
      <main className="min-h-screen bg-kavana-dark text-slate-100 p-4 md:p-8">
        <section className="mx-auto w-full max-w-[1700px] rounded-[2rem] border-2 border-kavana-orange bg-kavana-panel/90 p-4 md:p-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-kavana-orange/30 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.32em] text-kavana-orange-light">Kavana Manufacturing</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">Panel Supervisor</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <HelpModal {...SUPERVISOR_HELP} />
              {/* Botón Tour SIEMPRE visible */}
              <button
                onClick={startTour}
                className="min-h-[64px] rounded-2xl bg-kavana-orange/20 px-5 py-3 text-base font-bold text-kavana-orange-light border border-kavana-orange/30 shadow-lg transition hover:bg-kavana-orange/30 active:scale-95"
                title="Tour guiado del panel"
              >
                🎯 Tour
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="min-h-[64px] rounded-2xl bg-kavana-orange px-5 py-3 text-base font-bold text-white shadow-lg transition hover:bg-kavana-orange-light active:scale-95"
              >
                {showForm ? 'Cancelar' : '+ Nueva Orden'}
              </button>
              <ThemeToggle />
            </div>
          </header>

          {error && <ErrorState message={error} />}

          {orderNotice && (
            <div role="status" aria-live="polite" className={`mb-4 ${themed(NOTICE_INFO)}`}>
              {orderNotice}
            </div>
          )}

          {incidenciaNotice && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200"
            >
              {incidenciaNotice}
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
                    className="min-h-[64px] w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
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
                    className="min-h-[64px] w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                  >
                    <option value="">Seleccionar puesto...</option>
                    {workstations
                      .filter((w: any) => w.status === 'active')
                      .map((w: any) => (
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
                    className="min-h-[64px] w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">N.º Orden</label>
                  <input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="OP-0000"
                    className="min-h-[64px] w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Medida</label>
                  <input
                    value={measurement}
                    onChange={(e) => setMeasurement(e.target.value)}
                    placeholder="mm/cm"
                    className="min-h-[64px] w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Material</label>
                  <input
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="..."
                    className="min-h-[64px] w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Notas</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="..."
                    className="min-h-[64px] w-full rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2.5 text-sm text-white focus:border-kavana-orange focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <button
                    type="submit"
                    className="inline-flex min-h-[64px] items-center rounded-lg bg-kavana-orange px-6 py-2.5 text-sm font-bold text-white transition hover:bg-kavana-orange-light active:scale-95"
                  >
                    Crear orden
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className={themed(BUTTON_SECONDARY)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {(['resumen', 'live', 'oee', 'orders', 'workstations', 'incidencias'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`min-h-[64px] whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                  activeTab === tab
                    ? 'bg-kavana-orange text-white shadow'
                    : 'bg-kavana-surface text-slate-300 hover:text-white'
                }`}
              >
                {tab === 'resumen' ? '📊 RESUMEN' : tab === 'live' ? '⏱️ LÍNEA EN VIVO' : tab === 'oee' ? '📊 OEE AVANZADO' : tab === 'orders' ? '📋 ÓRDENES' : tab === 'workstations' ? '🏭 PUESTOS' : '🚨 INCIDENCIAS'}
              </button>
            ))}
          </div>

          {activeTab === 'resumen' ? (
            <ResumenTab />
          ) : activeTab === 'live' ? (
            <LiveLineTab />
          ) : activeTab === 'oee' ? (
            <OeeAdvancedTab />
          ) : activeTab === 'orders' ? (
            <>
              <OrderFiltersBar
                filters={filters}
                onChange={setFilters}
                workstations={workstations}
                view={view}
                onViewChange={setView}
                total={orders.length}
                hasMore={hasMore}
                onLoadMore={() => void loadMoreOrders()}
              />

              {isLoading && orders.length === 0 ? (
                <Loading label="Cargando órdenes..." />
              ) : orders.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="No hay órdenes con estos filtros"
                  description="Prueba a cambiar el estado o a limpiar la búsqueda."
                />
              ) : view === 'tablero' ? (
                <KanbanBoard
                  orders={orders}
                  changeOrderStatus={changeOrderStatus}
                  onDelete={removeOrder}
                />
              ) : (
                <OrdersTable
                  orders={orders}
                  onStatusChange={changeOrderStatus}
                  onDelete={removeOrder}
                  onActivity={handleToggleExpand}
                  expandedOrder={expandedOrder}
                />
              )}

              {expandedOrder && (
                <section className="mt-4 rounded-2xl border border-kavana-steel/25 bg-kavana-surface p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actividad de la orden</h4>
                    <button type="button" onClick={() => handleToggleExpand(expandedOrder)} className={themed(BUTTON_SECONDARY)}>
                      Cerrar
                    </button>
                  </div>
                  <ActivityFeed activity={activity} />
                </section>
              )}
            </>
          ) : activeTab === 'workstations' ? (
            <WorkstationBoard workstations={workstationStatus ?? []} />
          ) : incidenciasLoading ? (
            <Loading label="Cargando incidencias..." />
          ) : incidenciasError ? (
            <ErrorState message={incidenciasError} />
          ) : incidencias.length === 0 ? (
            <EmptyState title="No hay incidencias" description="Cuando un operario registre una, aparecerá aquí." />
          ) : (
            <IncidenciasKanban
              incidencias={incidencias}
              onStatusChange={changeIncidenciaStatus}
              onDelete={removeIncidencia}
            />
          )}
        </section>
      </main>
      <AiAdvisorFab />
      <TourComponent
        isOpen={tourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />
    </>
  );
}