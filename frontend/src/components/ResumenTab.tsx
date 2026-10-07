import { KpiCardsRow } from './KpiCardsRow.js';
import { ProductionChart } from './ProductionChart.js';
import { DowntimePareto } from './DowntimePareto.js';
import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';

export function ResumenTab() {
  const { orders, workstationStatus, incidencias } = useSupervisorPanel();
  
  // Calculate some summary stats for the resumen tab
  const totalWo = orders.length;
  const activeWo = orders.filter(o => o.status === 'in_progress').length;
  const completedWo = orders.filter(o => o.status === 'completed').length;
  const pendingWo = orders.filter(o => o.status === 'pending').length;
  
  // Calculate today's production target vs actual
  const today = new Date();
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at);
    return orderDate.toDateString() === today.toDateString();
  });
  
  const todayTarget = todayOrders.reduce((sum, order) => sum + order.quantity, 0);
  const todayActual = todayOrders.reduce((sum, order) => sum + (order.produced_quantity || 0), 0);
  
  // Calculate OEE trend (mock for now)
  const oeeTrend = [
    { date: 'Lun', value: 0.78 },
    { date: 'Mar', value: 0.82 },
    { date: 'Mié', value: 0.75 },
    { date: 'Jue', value: 0.85 },
    { date: 'Vie', value: 0.88 },
    { date: 'Sáb', value: 0.65 },
    { date: 'Dom', value: 0.60 }
  ];
  
  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <KpiCardsRow />
      
      {/* Main content grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Production Chart */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <ProductionChart />
        </div>
        
        {/* Downtime Pareto */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <DowntimePareto />
        </div>
        
        {/* Today's Performance */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Rendimiento del Día
              </h3>
              <div className="text-sm text-slate-500">
                {today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Target vs Actual */}
              <div className="flex items-baseline gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Objetivo diario</p>
                  <p className="text-2xl font-bold text-slate-900">{todayTarget.toLocaleString()} unidades</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Producción real</p>
                  <p className={`text-2xl font-bold ${todayActual >= todayTarget * 0.95 ? 'text-green-600' : todayActual >= todayTarget * 0.8 ? 'text-amber-600' : 'text-red-600'}`}>
                    {todayActual.toLocaleString()} unidades
                  </p>
                </div>
              </div>
              
              <div className="h-2 w-full bg-slate-200/50 rounded-full relative mt-2">
                <div 
                  className={`h-full w-[${Math.min((todayActual / todayTarget) * 100, 100)}%] 
                           ${todayActual >= todayTarget * 0.95 ? 'bg-green-500' : 
                            todayActual >= todayTarget * 0.8 ? 'bg-amber-500' : 
                            'bg-red-500'} rounded-full transition-all`}
                  style={{ 
                    width: `${Math.min((todayActual / todayTarget) * 100, 100)}%` 
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs mt-1">
                <span>0%</span>
                <span>100%</span>
                {todayTarget > 0 && (
                  <span className="text-slate-600">
                    {Math.round((todayActual / todayTarget) * 100)}% cumplimiento
                  </span>
                )}
              </div>
            </div>
            
            {/* Orders by status */}
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-1">Órdenes por estado</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="w-2 h-2 bg-green-500 rounded" />
                  <span>Completadas: {completedWo}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="w-2 h-2 bg-amber-500 rounded" />
                  <span>En proceso: {activeWo}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="w-2 h-2 bg-blue-500 rounded" />
                  <span>Pendientes: {pendingWo}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="w-2 h-2 bg-red-500 rounded" />
                  <span>Canceladas: {totalWo - completedWo - activeWo - pendingWo}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* OEE Trend Mini */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Tendencia OEE Semanal
              </h3>
              <div className="text-sm text-slate-500">
                Promedio: {(oeeTrend.reduce((sum, d) => sum + d.value, 0) / oeeTrend.length * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="h-32 relative">
              {/* Grid */}
              <div className="absolute inset-0 grid grid-cols-7 grid-rows-4 gap-0.5">
                {[...Array(3)].map((_, rowIndex) => (
                  <div key={rowIndex} className="col-span-7 border-b border-slate-200/50" />
                ))}
                {[...Array(7)].map((_, colIndex) => (
                  <div key={colIndex} className="row-span-4 border-r border-slate-200/50" />
                ))}
              </div>
              
              {/* OEE line */}
              <div className="absolute inset-0">
                <svg className="w-full h-full">
                  <polyline 
                    points={oeeTrend.map((point, index) => {
                      const x = (index / (oeeTrend.length - 1)) * 100;
                      const y = 100 - (point.value * 100);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="indigo-500"
                    stroke-width="2"
                  />
                </svg>
              </div>
              
              {/* Target line (85%) */}
              <div className="absolute left-0 right-0 h-0.5 bg-green-500/50"
                   style={{ bottom: '15%' }} />
                   
              {/* Axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between items-center w-4">
                <div className="text-xs text-slate-400">1.00</div>
                <div className="text-xs text-slate-400">0.85</div>
                <div className="text-xs text-slate-400">0.70</div>
                <div className="text-xs text-slate-400">0.50</div>
                <div className="text-xs text-slate-400">0.00</div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                {oeeTrend.map((point, index) => (
                  <div key={index} className="text-xs text-slate-500 w-full text-center">
                    {point.date}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between text-xs mt-1 text-slate-500">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>
          </div>
        </div>
        
        {/* Alertas y Notificaciones */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Alertas y Notificaciones
              </h3>
              <button className="text-sm text-kavana-orange hover:text-kavana-orange-dark">
                Ver todas
              </button>
            </div>
            
            {/* Alertas críticas */}
            <div className="space-y-3">
              {/* Workstation down */}
              {workstationStatus.some(ws => ws.status === 'down') && (
                <div className="p-3 rounded-lg border-l-4 border-red-500 bg-red-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                        !
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-red-600">Puesto detenido</p>
                      <p className="text-sm text-red-500">
                        {workstationStatus
                          .filter(ws => ws.status === 'down')
                          .map(ws => ws.name)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quality issues */}
              {incidencias.some(inc => inc.type === 'calidad' && inc.status === 'abierto') && (
                <div className="p-3 rounded-lg border-l-4 border-amber-500 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs">
                        !
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-amber-600">Problemas de calidad</p>
                      <p className="text-sm text-amber-500">
                        {incidencias
                          .filter(inc => inc.type === 'calidad' && inc.status === 'abierto')
                          .length} incidencias abiertas
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Maintenance needed */}
              {workstationStatus.some(ws => ws.status === 'maintenance') && (
                <div className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        !
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-blue-600">Mantenimiento requerido</p>
                      <p className="text-sm text-blue-500">
                        {workstationStatus
                          .filter(ws => ws.status === 'maintenance')
                          .map(ws => ws.name)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Low stock alert (mock) */}
              <div className="p-3 rounded-lg border-l-4 border-green-500 bg-green-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                      !
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-green-600">Stock crítico</p>
                    <p className="text-sm text-green-500">
                      Materiales bajo mínimo: 3 referencias
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2">Acciones rápidas</p>
              <div className="space-y-2">
                <button
                  className="w-full flex items-center justify-start px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-left text-sm hover:bg-slate-100"
                >
                  📊 Ver reporte de producción
                </button>
                <button
                  className="w-full flex items-center justify-start px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-left text-sm hover:bg-slate-100"
                >
                  ⏱️ Programar mantenimiento
                </button>
                <button
                  className="w-full flex items-center justify-start px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-left text-sm hover:bg-slate-100"
                >
                  📋 Revisar pendientes de calidad
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}