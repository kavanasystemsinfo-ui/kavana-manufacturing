import { useEffect, useState } from 'react';
import { KpiCardsRow } from './KpiCardsRow.js';
import { ProductionChart } from './ProductionChart.js';
import { DowntimePareto } from './DowntimePareto.js';
import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';
import { rendimientoDelDia } from '../utils/resumen-kpi.js';
import { formatNumber } from '../utils/formatNumber.js';
import { fetchOeeDaily, type OeeDia } from '../api/analytics.js';

const COLOR_NIVEL = {
  verde: { texto: 'text-green-600', barra: 'bg-green-500' },
  ambar: { texto: 'text-amber-600', barra: 'bg-amber-500' },
  rojo: { texto: 'text-red-600', barra: 'bg-red-500' },
} as const;

export function ResumenTab() {
  const { orders, workstationStatus, incidencias } = useSupervisorPanel();
  
  // Calculate some summary stats for the resumen tab
  const totalWo = orders.length;
  const activeWo = orders.filter(o => o.status === 'in_progress').length;
  const completedWo = orders.filter(o => o.status === 'completed').length;
  const pendingWo = orders.filter(o => o.status === 'pending').length;
  
  // Objetivo real frente a lo producido hoy, con los NUMERIC de pg ya
  // convertidos a número (antes salían concatenados: "01827.00001328.0000...").
  const today = new Date();
  const rendimiento = rendimientoDelDia(orders, today);
  
  // Tendencia de OEE de los últimos 7 días, calculada por el backend.
  const [oeeSerie, setOeeSerie] = useState<OeeDia[]>([]);
  const [oeeCargando, setOeeCargando] = useState(true);
  const [oeeError, setOeeError] = useState<string | null>(null);
  
  useEffect(() => {
    let cancelado = false;
    fetchOeeDaily(7)
      .then((serie) => { if (!cancelado) { setOeeSerie(serie); setOeeError(null); } })
      .catch(() => { if (!cancelado) setOeeError('No se pudo cargar la tendencia de OEE'); })
      .finally(() => { if (!cancelado) setOeeCargando(false); });
    return () => { cancelado = true; };
  }, []);
  
  const oeePromedio = oeeSerie.length > 0
    ? oeeSerie.reduce((sum, d) => sum + d.oee, 0) / oeeSerie.length
    : null;
  
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
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(rendimiento.objetivo)} unidades</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Producción real</p>
                  <p className={`text-2xl font-bold ${COLOR_NIVEL[rendimiento.nivel].texto}`}>
                    {formatNumber(rendimiento.real)} unidades
                  </p>
                </div>
              </div>
              
              <div className="h-2 w-full bg-slate-200/50 rounded-full relative mt-2">
                <div 
                  className={`h-full ${COLOR_NIVEL[rendimiento.nivel].barra} rounded-full transition-all`}
                  style={{ width: `${rendimiento.progresoPct}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs mt-1">
                <span>0%</span>
                <span>100%</span>
                {rendimiento.cumplimiento !== null && (
                  <span className="text-slate-600">
                    {rendimiento.cumplimiento}% cumplimiento
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
                {oeePromedio !== null
                  ? `Promedio: ${oeePromedio.toFixed(1)}%`
                  : oeeCargando ? 'Cargando…' : 'Sin datos'}
              </div>
            </div>

            {oeeSerie.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-slate-400 text-center px-4">
                {oeeCargando
                  ? 'Cargando tendencia…'
                  : (oeeError ?? 'Sin partes de producción en los últimos 7 días')}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="flex flex-col justify-between items-end h-32 text-xs text-slate-400">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>
                  <div className="relative flex-1 h-32">
                    {[0, 25, 50, 75].map((pct) => (
                      <div
                        key={pct}
                        className="absolute left-0 right-0 border-b border-slate-200/50"
                        style={{ top: `${pct}%` }}
                      />
                    ))}
                    {/* Objetivo de OEE: 85 % (y = 100 - valor) */}
                    <div className="absolute left-0 right-0 h-0.5 bg-green-500/50" style={{ top: '15%' }} />
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full"
                    >
                      {oeeSerie.length > 1 && (
                        <polyline
                          points={oeeSerie
                            .map((p, i) => `${(i / (oeeSerie.length - 1)) * 100},${100 - p.oee}`)
                            .join(' ')}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                      {oeeSerie.map((p, i) => (
                        <circle
                          key={p.date}
                          cx={oeeSerie.length > 1 ? (i / (oeeSerie.length - 1)) * 100 : 50}
                          cy={100 - p.oee}
                          r="1.5"
                          fill="#6366f1"
                        />
                      ))}
                    </svg>
                  </div>
                </div>

                <div className="flex justify-between text-xs mt-1 text-slate-500 pl-10">
                  {oeeSerie.map((p) => (
                    <span key={p.date}>
                      {new Date(`${p.date}T00:00:00`).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  ))}
                </div>
              </>
            )}
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
              {/* Workstation down: el semáforo que deriva el backend es
                  state ('running' | 'stopped' | 'idle'); status solo dice si
                  el puesto está activo de alta, así que con status no había
                  forma de acertar y la alerta nunca salía. */}
              {workstationStatus.some(ws => ws.state === 'stopped') && (
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
                          .filter(ws => ws.state === 'stopped')
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
              
              {/* La alerta de "Mantenimiento requerido" existía contra un
                  estado 'maintenance' que no existe en el modelo de datos
                  (status es active/inactive, state es running/stopped/idle):
                  estaba muerta y solo ocupaba sitio. */}
              
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