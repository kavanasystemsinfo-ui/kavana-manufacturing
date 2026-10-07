import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchOeeDaily,
  fetchOeeHourly,
  fetchOeeWorkstations,
  type OeeWorkstation,
} from '../api/analytics.js';
import {
  aPuntosTendencia,
  escalaX,
  puntosDeLinea,
  rankingDesde,
  type PuestoRanking,
  type PuntoTendencia,
} from '../utils/oee-tab.js';

interface OeeMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

interface TimeRangeData {
  label: string;
  value: 'day' | 'week' | 'month';
}

interface SixBigLoss {
  label: string;
  value: number;
  color: string;
  category: 'availability' | 'performance' | 'quality';
}

export function OeeAdvancedTab() {
  const { workstationStatus } = useSupervisorPanel();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [puestosHoy, setPuestosHoy] = useState<OeeWorkstation[]>([]);
  const [serieTendencia, setSerieTendencia] = useState<PuntoTendencia[]>([]);
  const [tendenciaCargando, setTendenciaCargando] = useState(true);
  const [tendenciaError, setTendenciaError] = useState<string | null>(null);

  useEffect(() => {
    const ahora = new Date();
    const inicioDelDia = new Date(ahora);
    inicioDelDia.setHours(0, 0, 0, 0);

    let cancelado = false;
    fetchOeeWorkstations(inicioDelDia.toISOString(), ahora.toISOString())
      .then((puestos) => { if (!cancelado) setPuestosHoy(puestos); })
      .catch(() => { if (!cancelado) setPuestosHoy([]); });
    return () => { cancelado = true; };
  }, []);

  // Tendencia real: "Día" → oee-hourly (24 huecos), "Semana"/"Mes" →
  // oee-daily. Sin Math.random: cada punto sale del backend.
  useEffect(() => {
    let cancelado = false;
    setTendenciaCargando(true);
    setTendenciaError(null);
    const peticion =
      timeRange === 'day'
        ? fetchOeeHourly(24)
        : timeRange === 'week'
          ? fetchOeeDaily(7)
          : fetchOeeDaily(30);
    peticion
      .then((serie) => {
        if (cancelado) return;
        setSerieTendencia(aPuntosTendencia(serie));
        setTendenciaCargando(false);
      })
      .catch(() => {
        if (cancelado) return;
        setSerieTendencia([]);
        setTendenciaCargando(false);
        setTendenciaError('No se pudo cargar la tendencia');
      });
    return () => { cancelado = true; };
  }, [timeRange]);

  const timeRanges: TimeRangeData[] = useMemo(() => [
    { label: 'Día', value: 'day' },
    { label: 'Semana', value: 'week' },
    { label: 'Mes', value: 'month' },
  ], []);

  // OEE de planta de hoy, del endpoint real: media de los puestos que sí
  // tienen partes registrados. El backend devuelve porcentajes (0-100) y
  // esta pantalla trabaja en fracción (0-1).
  const oeeMetrics = useMemo<OeeMetrics | null>(() => {
    const conDatos = puestosHoy.filter((p) => !p.sin_datos);
    if (conDatos.length === 0) return null;
    const media = (campo: 'availability' | 'performance' | 'quality' | 'oee') =>
      conDatos.reduce((suma, p) => suma + (Number(p[campo]) || 0), 0) / conDatos.length / 100;
    return {
      availability: media('availability'),
      performance: media('performance'),
      quality: media('quality'),
      oee: media('oee'),
    };
  }, [puestosHoy]);

  // OEE calculado = A × P × Q sobre los datos de hoy.
  const calculatedOee = useMemo(() => {
    if (!oeeMetrics) return 0;
    return (oeeMetrics.availability || 0) *
           (oeeMetrics.performance || 0) *
           (oeeMetrics.quality || 0);
  }, [oeeMetrics]);

  // Tendencia (último vs primero). Sin serie suficiente o partiendo de 0 no
  // hay porcentaje honesto que mostrar.
  const trend = useMemo(() => {
    if (serieTendencia.length < 2) return null;
    const first = serieTendencia[0].oee;
    const last = serieTendencia[serieTendencia.length - 1].oee;
    if (first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [serieTendencia]);

  // Ranking real de puestos: peor primero; los que no tienen partes hoy
  // quedan al final con "sin datos" en vez de un cero de mentira.
  const workstationRanking = useMemo<PuestoRanking[]>(
    () => rankingDesde(puestosHoy, workstationStatus),
    [puestosHoy, workstationStatus],
  );

  // Six Big Losses: reparto proporcional fijo de la pérdida total real
  // (1 - OEE). No es una medición por motivo, es un modelo derivado del OEE.
  const sixBigLosses = useMemo<SixBigLoss[]>(() => {
    if (!oeeMetrics) return [];
    const totalLoss = 1 - calculatedOee;
    const losses: SixBigLoss[] = [
      { label: 'Averías (Breakdowns)', value: totalLoss * 0.30, color: 'bg-red-500', category: 'availability' },
      { label: 'Ajustes y preparaciones (Setup/Adjust)', value: totalLoss * 0.25, color: 'bg-orange-500', category: 'availability' },
      { label: 'Paradas menores (Minor Stops)', value: totalLoss * 0.20, color: 'bg-amber-500', category: 'performance' },
      { label: 'Reducción de velocidad (Reduced Speed)', value: totalLoss * 0.15, color: 'bg-yellow-500', category: 'performance' },
      { label: 'Defectos en proceso (Process Defects)', value: totalLoss * 0.06, color: 'bg-green-500', category: 'quality' },
      { label: 'Reducción de rendimiento (Yield Loss)', value: totalLoss * 0.04, color: 'bg-blue-500', category: 'quality' }
    ];
    return losses.filter(loss => loss.value > 0.005); // Only show significant losses
  }, [calculatedOee, oeeMetrics]);

  // Category totals for summary
  const availabilityLoss = useMemo(() =>
    sixBigLosses.filter(l => l.category === 'availability').reduce((sum, l) => sum + l.value, 0), [sixBigLosses]);
  const performanceLoss = useMemo(() =>
    sixBigLosses.filter(l => l.category === 'performance').reduce((sum, l) => sum + l.value, 0), [sixBigLosses]);
  const qualityLoss = useMemo(() =>
    sixBigLosses.filter(l => l.category === 'quality').reduce((sum, l) => sum + l.value, 0), [sixBigLosses]);

  const colorBarra = (oee: number | null): string => {
    if (oee === null) return 'bg-slate-300';
    if (oee < 0.7) return 'bg-red-500';
    if (oee < 0.8) return 'bg-amber-500';
    return 'bg-green-500';
  };

  // Eje X proporcional al tiempo y corte de lineas en los huecos: la serie
  // horaria solo trae las horas con bloques y un hueco no es una hora mas.
  const pasoMs = timeRange === 'day' ? 3_600_000 : 86_400_000;
  const xDe = escalaX(serieTendencia);

  const colorSerie: Record<'availability' | 'performance' | 'quality', string> = {
    availability: '#22c55e',
    performance: '#3b82f6',
    quality: '#f59e0b',
  };
  
  return (
    <div className="space-y-4">
      {/* Header with time range selector */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">
            Análisis OEE Avanzado
          </h3>
          <p className="text-sm text-slate-500">
            Eficiencia Global de los Equipos — Desglose por categorías y pérdidas
          </p>
        </div>
        
        <div className="flex sm:flex-row flex-col gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Período:
            </label>
            <div className="flex gap-2">
              {timeRanges.map(range => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all 
                           ${timeRange === range.value 
                             ? 'bg-kavana-orange text-white' 
                             : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 sm:flex-none text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {oeeMetrics ? `${(calculatedOee * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-slate-500">
              {trend === null ? (
                'OEE —'
              ) : (
                <>OEE {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%</>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content: Gauges + Trend + Ranking + Losses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Availability Gauge */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-medium text-slate-700">Disponibilidad</h4>
              <div className="text-xs text-slate-500">
                {oeeMetrics ? `${(oeeMetrics.availability * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="h-12 w-full bg-slate-200/50 rounded-full relative">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(oeeMetrics?.availability || 0) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
            
            {/* Loss breakdown for availability */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Pérdidas de Disponibilidad: {oeeMetrics ? `${(availabilityLoss * 100).toFixed(1)}%` : '—'}</p>
              {sixBigLosses.filter(l => l.category === 'availability').map((loss, idx) => (
                <div key={idx} className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded ${loss.color}`}></span>
                    {loss.label}
                  </span>
                  <span className="font-medium text-slate-700">{(loss.value * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Performance Gauge */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-medium text-slate-700">Rendimiento</h4>
              <div className="text-xs text-slate-500">
                {oeeMetrics ? `${(oeeMetrics.performance * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="h-12 w-full bg-slate-200/50 rounded-full relative">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(oeeMetrics?.performance || 0) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
            
            {/* Loss breakdown for performance */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Pérdidas de Rendimiento: {oeeMetrics ? `${(performanceLoss * 100).toFixed(1)}%` : '—'}</p>
              {sixBigLosses.filter(l => l.category === 'performance').map((loss, idx) => (
                <div key={idx} className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded ${loss.color}`}></span>
                    {loss.label}
                  </span>
                  <span className="font-medium text-slate-700">{(loss.value * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Quality Gauge */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-medium text-slate-700">Calidad</h4>
              <div className="text-xs text-slate-500">
                {oeeMetrics ? `${(oeeMetrics.quality * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="h-12 w-full bg-slate-200/50 rounded-full relative">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${(oeeMetrics?.quality || 0) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
            
            {/* Loss breakdown for quality */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Pérdidas de Calidad: {oeeMetrics ? `${(qualityLoss * 100).toFixed(1)}%` : '—'}</p>
              {sixBigLosses.filter(l => l.category === 'quality').map((loss, idx) => (
                <div key={idx} className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded ${loss.color}`}></span>
                    {loss.label}
                  </span>
                  <span className="font-medium text-slate-700">{(loss.value * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* OEE Trend Chart */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-medium text-slate-700">
                Tendencia OEE y Componentes ({timeRange === 'day' ? 'Horas' : 'Días'})
              </h4>
              <div className="text-xs text-slate-500">
                Últimos {timeRange === 'day' ? '24h' : timeRange === 'week' ? '7d' : '30d'}
              </div>
            </div>
            {tendenciaCargando ? (
              <div className="h-48 flex items-center justify-center text-sm text-slate-500">
                Cargando tendencia…
              </div>
            ) : tendenciaError ? (
              <div className="h-48 flex items-center justify-center text-sm text-red-500">
                {tendenciaError}
              </div>
            ) : serieTendencia.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-sm text-slate-500">
                Sin partes registrados en el periodo
              </div>
            ) : (
              <>
            <div className="h-48 relative">
              {/* Grid: lineas horizontales cada 0.20 (casan con las etiquetas del eje) */}
              <div className="absolute inset-0 pointer-events-none">
                {[20, 40, 60, 80].map((top) => (
                  <div key={top} className="absolute left-0 right-0 border-b border-slate-200/50" style={{ top: `${top}%` }} />
                ))}
                {[20, 40, 60, 80].map((left) => (
                  <div key={left} className="absolute top-0 bottom-0 border-r border-slate-200/50" style={{ left: `${left}%` }} />
                ))}
              </div>

              {/* Lineas: viewBox 0-100 + preserveAspectRatio none para que
                  el grafico llene el contenedor; colores hex reales (una clase
                  Tailwind no es un color SVG) y non-scaling-stroke para que el
                  grosor no se deforme al estirarse. */}
              <div className="absolute inset-0">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {(['availability', 'performance', 'quality'] as const).flatMap((campo) =>
                    puntosDeLinea(serieTendencia, campo, pasoMs).map((puntos, i) => (
                      <polyline
                        key={`${campo}-${i}`}
                        points={puntos}
                        fill="none"
                        stroke={colorSerie[campo]}
                        strokeWidth="1.5"
                        strokeDasharray="5,3"
                        opacity="0.7"
                        vectorEffect="non-scaling-stroke"
                      />
                    )),
                  )}
                  {puntosDeLinea(serieTendencia, 'oee', pasoMs).map((puntos, i) => (
                    <polyline
                      key={`oee-${i}`}
                      points={puntos}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              </div>

              {/* Target line (85% OEE) */}
              <div className="absolute left-0 right-0 h-0.5 bg-green-500/50"
                   style={{ bottom: '15%' }} />

              {/* Axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between items-center w-4">
                <div className="text-xs text-slate-400">1.00</div>
                <div className="text-xs text-slate-400">0.80</div>
                <div className="text-xs text-slate-400">0.60</div>
                <div className="text-xs text-slate-400">0.40</div>
                <div className="text-xs text-slate-400">0.20</div>
                <div className="text-xs text-slate-400">0.00</div>
              </div>

              {/* Etiquetas X colocadas en su posicion temporal real, sin
                  solaparse (se evalua la distancia sobre la posicion ya
                  clampeada, no sobre el dato crudo). */}
              <div className="absolute bottom-0 left-0 right-0 h-4">
                {serieTendencia.reduce<{ fecha: string; x: number }[]>((elegidas, point) => {
                  const x = Math.min(96, Math.max(8, xDe(point.date)));
                  const ultima = elegidas[elegidas.length - 1];
                  if (!ultima || x - ultima.x >= 6) elegidas.push({ fecha: point.date, x });
                  return elegidas;
                }, []).map((etiqueta) => (
                  <div
                    key={etiqueta.fecha}
                    className="absolute bottom-0 text-xs text-slate-500 text-center whitespace-nowrap"
                    style={{ left: `${etiqueta.x}%`, transform: 'translateX(-50%)' }}
                  >
                    {timeRange === 'day'
                      ? new Date(etiqueta.fecha).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : new Date(etiqueta.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex mt-3 gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-indigo-500" />
                <span>OEE</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-green-500" style={{ borderTop: '2px dashed' }} />
                <span>Disponibilidad</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-blue-500" style={{ borderTop: '2px dashed' }} />
                <span>Rendimiento</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-amber-500" style={{ borderTop: '2px dashed' }} />
                <span>Calidad</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-green-500/50" />
                <span>Target 85%</span>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
        
        {/* Workstation Ranking */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-medium text-slate-700">
                Ranking Workstations
              </h4>
              <div className="text-xs text-slate-500">
                (Peor primero)
              </div>
            </div>
            <div className="h-48">
              {workstationRanking.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  Sin datos de OEE hoy
                </div>
              ) : (
              <div className="space-y-2">
                {workstationRanking.slice(0, 8).map((ws, index) => (
                  <div key={ws.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${colorBarra(ws.oee)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <div className="font-medium">{ws.name}</div>
                        <div className="text-slate-600">#{index + 1}</div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <div>OEE: {ws.oee === null ? '—' : `${(ws.oee * 100).toFixed(1)}%`}</div>
                        <div className="flex-1">
                          <div className="h-1.5 w-full bg-slate-200/50 rounded-full">
                            <div
                              className={`h-full rounded-full ${colorBarra(ws.oee)}`}
                              style={{ width: `${(ws.oee ?? 0) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Six Big Losses - Stacked Bar */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-medium text-slate-700">
                Seis Grandes Pérdidas
              </h4>
              <div className="text-xs text-slate-500">
                Pérdidas totales: {oeeMetrics ? `${((1 - calculatedOee) * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="h-48">
              <div className="space-y-2">
                {sixBigLosses.map((loss, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div 
                        className={`w-2 h-2 rounded-full ${loss.color}`} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <div className="font-medium">{loss.label}</div>
                        <div className="text-slate-600">{(loss.value * 100).toFixed(1)}%</div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200/50 rounded-full">
                        <div
                          className={`h-full ${loss.color} rounded-full`}
                          style={{ width: `${Math.min(100, loss.value * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {!sixBigLosses.length && (
                  <div className="text-center py-8 text-slate-500">
                    {oeeMetrics
                      ? 'OEE óptimo - sin pérdidas significativas'
                      : 'Sin datos de OEE hoy'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Detailed Workstation Table */}
        <div className="col-span-3">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h4 className="text-sm font-semibold text-slate-900">Detalle por Workstation</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Puesto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">OEE</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Disp.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Rend.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Calidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workstationRanking.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                        Sin datos de OEE hoy
                      </td>
                    </tr>
                  )}
                  {workstationRanking.map((ws, index) => (
                    <tr key={ws.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">{ws.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-500">{ws.code}</td>
                      <td className="px-4 py-2 text-right text-sm font-bold">
                        {ws.oee === null ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                            Sin datos
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ws.oee >= 0.85 ? 'bg-green-100 text-green-700' : ws.oee >= 0.7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {(ws.oee * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">
                        {ws.availability === null ? '—' : `${(ws.availability * 100).toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">
                        {ws.performance === null ? '—' : `${(ws.performance * 100).toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">
                        {ws.quality === null ? '—' : `${(ws.quality * 100).toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}