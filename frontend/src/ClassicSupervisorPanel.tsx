import { useState } from 'react';
import { useSupervisorPanel } from './hooks/useSupervisorPanel.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { ActivityFeed } from './components/ActivityFeed.js';
import { WorkstationBoard } from './components/WorkstationBoard.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { IncidenciasKanban } from './components/incidencias/IncidenciasKanban.js';
import type { Incidencia } from './api/admin-entities.js';
import { HelpModal } from './components/HelpModal.js';
import { SUPERVISOR_HELP } from './help-content.js';
import { Loading } from './components/ui/Loading.js';
import { OrderFiltersBar, type OrdersView } from './components/supervisor/OrderFiltersBar.js';
import { OrdersTable } from './components/supervisor/OrdersTable.js';
import { BUTTON_SECONDARY, NOTICE_INFO, themed } from './utils/ui-tokens.js';

/**
 * El tablero de incidencias con su carga y su error, como lo pintaba la lista que
 * sustituye. Decision de Jorge (2026-09-24): el supervisor ve el tablero tambien
 * en el tema clasico, que es el que viene por defecto, no solo en el moderno.
 */
function IncidenciasTablero({ incidencias, loading, error, onStatusChange, onDelete }: {
  incidencias: Incidencia[];
  loading: boolean;
  error: string | null;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  if (loading) return <div className="py-12 text-center text-slate-500">Cargando incidencias...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;
  if (incidencias.length === 0)
    return (
      <div className="py-12 text-center text-slate-500">
        No hay incidencias. Cuando alguien registre una, aparecerá aquí.
      </div>
    );
  return <IncidenciasKanban incidencias={incidencias} onStatusChange={onStatusChange} onDelete={onDelete} />;
}

/**
 * Panel de supervisión, tema clásico.
 *
 * Comparte con el tema Kavana la barra de filtros, la tabla y el tablero: los dos
 * temas cambian el color y el reparto de espacio, no lo que se puede hacer. Antes
 * el clásico solo tenía botones por tarjeta y el moderno solo arrastre, así que
 * cambiar de tema obligaba a reaprender la misma tarea y a buscar los datos en
 * sitios distintos.
 */
export function ClassicSupervisorPanel() {
  const {
    orders, models, workstations, workstationStatus, activity,
    isLoading, error, showForm, setShowForm, selectedModel, setSelectedModel,
    selectedWorkstation, setSelectedWorkstation, quantity, setQuantity,
    orderNumber, setOrderNumber, measurement, setMeasurement, material,
    setMaterial, notes, setNotes, activeTab, setActiveTab, expandedOrder,
    setExpandedOrder, incidencias, incidenciasLoading, incidenciasError,
    filters, setFilters, hasMore, loadMoreOrders, orderNotice, incidenciaNotice,
    handleSubmit, changeOrderStatus, removeOrder, changeIncidenciaStatus, removeIncidencia,
  } = useSupervisorPanel();

  // El clásico abre en lista: es su forma de siempre, ahora con columnas.
  const [view, setView] = useState<OrdersView>('tablero');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-kavana-dark text-white shadow-md">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-kavana-dark font-bold text-sm">KV</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-kavana-orange-light">Kavana Manufacturing HMI</p>
                <h1 className="text-lg font-semibold text-white">Panel de Supervisión</h1>
                <p className="text-xs text-gray-300">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HelpModal {...SUPERVISOR_HELP} theme="classic" />
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex min-h-[64px] items-center gap-2 rounded-md bg-kavana-orange px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-kavana-orange-light active:scale-95"
              >
                {showForm ? 'Cancelar' : '+ Nueva Orden'}
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[94%] max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {orderNotice && (
          <div role="status" aria-live="polite" className={`mb-4 ${themed(NOTICE_INFO, true)}`}>
            {orderNotice}
          </div>
        )}

        {/* El aviso de incidencias existía solo en el tema Kavana: mover o
            intentar borrar una incidencia desde el clásico no contaba nada. */}
        {incidenciaNotice && (
          <div role="status" aria-live="polite" className={`mb-4 ${themed(NOTICE_INFO, true)}`}>
            {incidenciaNotice}
          </div>
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
                  <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="mt-1 block min-h-[64px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:outline-none focus:ring-1 focus:ring-kavana-orange" required>
                    <option value="">Seleccionar...</option>
                    {models.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.unit_of_measure})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Puesto</label>
                  <select value={selectedWorkstation} onChange={(e) => setSelectedWorkstation(e.target.value)} className="mt-1 block min-h-[64px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:outline-none focus:ring-1 focus:ring-kavana-orange" required>
                    <option value="">Seleccionar...</option>
                    {workstations.filter(w => w.status === 'active').map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Cantidad</label>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="mt-1 block min-h-[64px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:outline-none focus:ring-1 focus:ring-kavana-orange" placeholder="Ej: 100" required />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={isLoading} className="inline-flex min-h-[64px] items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 active:scale-95 disabled:opacity-50">
                    {isLoading ? 'Creando...' : 'Crear'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className={themed(BUTTON_SECONDARY, true)}>
                    Cancelar
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">N. de Orden</label>
                  <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="mt-1 block min-h-[64px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:outline-none focus:ring-1 focus:ring-kavana-orange" placeholder="Ej: ORD-2026-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Medida</label>
                  <input type="text" value={measurement} onChange={(e) => setMeasurement(e.target.value)} className="mt-1 block min-h-[64px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:outline-none focus:ring-1 focus:ring-kavana-orange" placeholder="Ej: 20x20mm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Material</label>
                  <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1 block min-h-[64px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:outline-none focus:ring-1 focus:ring-kavana-orange" placeholder="Ej: Aluminio 6063" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Notas</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block min-h-[64px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:outline-none focus:ring-1 focus:ring-kavana-orange" placeholder="Notas..." />
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button onClick={() => setActiveTab('orders')} className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'orders' ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Órdenes
          </button>
          <button onClick={() => setActiveTab('workstations')} className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'workstations' ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Puestos ({workstationStatus.length})
          </button>
          <button onClick={() => setActiveTab('incidencias')} className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'incidencias' ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            🚨 Incidencias ({incidencias.length})
          </button>
        </div>

        {activeTab === 'orders' ? (
          <>
            <OrderFiltersBar
              isClassic
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
              <Loading label="Cargando órdenes..." isClassic />
            ) : orders.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                No hay órdenes con estos filtros.
              </div>
            ) : view === 'tablero' ? (
              <KanbanBoard
                orders={orders}
                changeOrderStatus={changeOrderStatus}
                isClassic
                onDelete={removeOrder}
              />
            ) : (
              <OrdersTable
                isClassic
                orders={orders}
                onStatusChange={changeOrderStatus}
                onDelete={removeOrder}
                onActivity={(id) => setExpandedOrder(expandedOrder === id ? null : id)}
                expandedOrder={expandedOrder}
              />
            )}

            {expandedOrder && (
              <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Actividad de la orden</h4>
                  <button type="button" onClick={() => setExpandedOrder(null)} className={themed(BUTTON_SECONDARY, true)}>
                    Cerrar
                  </button>
                </div>
                <ActivityFeed activity={activity} />
              </section>
            )}
          </>
        ) : activeTab === 'workstations' ? (
          <WorkstationBoard workstations={workstationStatus} />
        ) : (
          <IncidenciasTablero
            incidencias={incidencias}
            loading={incidenciasLoading}
            error={incidenciasError}
            onStatusChange={changeIncidenciaStatus}
            onDelete={removeIncidencia}
          />
        )}
      </main>
    </div>
  );
}
