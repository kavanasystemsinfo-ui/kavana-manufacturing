import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';
import { useMemo, useState } from 'react';

interface OeeMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

interface WorkstationOee {
  id: string;
  name: string;
  code: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  totalProduced: number;
  totalDefects: number;
  productionTimeMs: number;
  downtimeMs: number;
}

interface TimeRangeData {
  label: string;
  value: 'day' | 'week' | 'month' | 'quarter';
}

interface TrendPoint {
  date: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

interface SixBigLoss {
  label: string;
  value: number;
  color: string;
  category: 'availability' | 'performance' | 'quality';
}

export function OeeAdvancedTab() {
  const { workstationStatus, oeeMetrics } = useSupervisorPanel();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  
  const timeRanges: TimeRangeData[] = useMemo(() => [
    { label: 'Día', value: 'day' },
    { label: 'Semana', value: 'week' },
    { label: 'Mes', value: 'month' },
  ], []);

  // Calculate OEE from the three components
  const calculatedOee = useMemo(() => {
    if (!oeeMetrics) return 0;
    return (oeeMetrics.availability || 0) * 
           (oeeMetrics.performance || 0) * 
           (oeeMetrics.quality || 0);
  }, [oeeMetrics]);

  // Mock historical data for trend chart - in reality from endpoint
  const trendData = useMemo(() => {
    const data: TrendPoint[] = [];
    const today = new Date();
    const days = timeRange === 'day' ? 24 : 
                timeRange === 'week' ? 7 : 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      if (timeRange === 'day') {
        date.setHours(today.getHours() - i);
      } else {
        date.setDate(today.getDate() - i);
      }
      
      // Simulate OEE with some variance around a base
      const baseOee = 0.75 + (Math.random() * 0.2); // 75-95%
      const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
      const oee = Math.max(0, Math.min(1, baseOee + variance));
      
      data.push({
        date: date.toISOString(),
        oee: Number(oee.toFixed(3)),
        availability: Number((0.85 + (Math.random() - 0.5) * 0.15).toFixed(3)),
        performance: Number((0.80 + (Math.random() - 0.5) * 0.20).toFixed(3)),
        quality: Number((0.95 + (Math.random() - 0.5) * 0.10).toFixed(3)),
      });
    }
    
    return data;
  }, [timeRange]);
  
  // Calculate trend (simple: last vs first)
  const trend = useMemo(() => {
    if (trendData.length < 2) return 0;
    const first = trendData[0].oee;
    const last = trendData[trendData.length - 1].oee;
    return ((last - first) / first) * 100;
  }, [trendData]);
  
  // Workstation ranking (worst first)
  const workstationRanking = useMemo(() => {
    // In reality, this would come from an endpoint with per-workstation OEE
    // For demo, we'll generate mock data based on actual workstations
    return workstationStatus.map(ws => ({
      id: ws.id,
      name: ws.name,
      code: ws.code,
      oee: 0.6 + Math.random() * 0.3, // 60-90%
      availability: 0.7 + Math.random() * 0.25,
      performance: 0.75 + Math.random() * 0.2,
      quality: 0.8 + Math.random() * 0.15,
      totalProduced: Math.floor(5000 + Math.random() * 15000),
      totalDefects: Math.floor(Math.random() * 200),
      productionTimeMs: Math.floor(4 * 60 * 60 * 1000 * (0.8 + Math.random() * 0.2)),
      downtimeMs: Math.floor(1 * 60 * 60 * 1000 * Math.random() * 0.5),
    }))
    .sort((a, b) => a.oee - b.oee); // Worst first
  }, [workstationStatus]);
  
  // Six Big Losses breakdown
  const sixBigLosses = useMemo(() => {
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
  }, [calculatedOee]);
  
  // Category totals for summary
  const availabilityLoss = useMemo(() => 
    sixBigLosses.filter(l => l.category === 'availability').reduce((sum, l) => sum + l.value, 0), [sixBigLosses]);
  const performanceLoss = useMemo(() => 
    sixBigLosses.filter(l => l.category === 'performance').reduce((sum, l) => sum + l.value, 0), [sixBigLosses]);
  const qualityLoss = useMemo(() => 
    sixBigLosses.filter(l => l.category === 'quality').reduce((sum, l) => sum + l.value, 0), [sixBigLosses]);
  
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
              {calculatedOee.toFixed(1) * 100}%
            </div>
            <div className="text-xs text-slate-500">
              OEE {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
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
                {(oeeMetrics?.availability || 0) * 100}%
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
              <p className="text-xs text-slate-500 mb-2">Pérdidas de Disponibilidad: {(availabilityLoss * 100).toFixed(1)}%</p>
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
                {(oeeMetrics?.performance || 0) * 100}%
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
              <p className="text-xs text-slate-500 mb-2">Pérdidas de Rendimiento: {(performanceLoss * 100).toFixed(1)}%</p>
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
                {(oeeMetrics?.quality || 0) * 100}%
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
              <p className="text-xs text-slate-500 mb-2">Pérdidas de Calidad: {(qualityLoss * 100).toFixed(1)}%</p>
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
                Tendencia OEE y Componentes ({timeRange === 'day' ? 'Horas' : timeRange === 'week' ? 'Días' : 'Semanas'})
              </h4>
              <div className="text-xs text-slate-500">
                Últimos {timeRange === 'day' ? '24h' : timeRange === 'week' ? '7d' : '30d'}
              </div>
            </div>
            <div className="h-48 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 grid grid-cols-[trendData.length] grid-rows-5 gap-0.5">
                {[...Array(4)].map((_, rowIndex) => (
                  <div key={rowIndex} className="col-span-[trendData.length] border-b border-slate-200/50" />
                ))}
                {[...Array(trendData.length)].map((_, colIndex) => (
                  <div key={colIndex} className="row-span-5 border-r border-slate-200/50" />
                ))}
              </div>
              
              {/* OEE lines */}
              <div className="absolute inset-0">
                <svg className="w-full h-full">
                  {/* OEE line */}
                  <polyline 
                    points={trendData.map((point, index) => {
                      const x = (index / (trendData.length - 1)) * 100;
                      const y = 100 - (point.oee * 100);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="indigo-500"
                    stroke-width="2"
                  />
                  {/* Availability line */}
                  <polyline 
                    points={trendData.map((point, index) => {
                      const x = (index / (trendData.length - 1)) * 100;
                      const y = 100 - (point.availability * 100);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="green-500"
                    stroke-width="1.5"
                    stroke-dasharray="5,3"
                    opacity="0.7"
                  />
                  {/* Performance line */}
                  <polyline 
                    points={trendData.map((point, index) => {
                      const x = (index / (trendData.length - 1)) * 100;
                      const y = 100 - (point.performance * 100);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="blue-500"
                    stroke-width="1.5"
                    stroke-dasharray="5,3"
                    opacity="0.7"
                  />
                  {/* Quality line */}
                  <polyline 
                    points={trendData.map((point, index) => {
                      const x = (index / (trendData.length - 1)) * 100;
                      const y = 100 - (point.quality * 100);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="amber-500"
                    stroke-width="1.5"
                    stroke-dasharray="5,3"
                    opacity="0.7"
                  />
                </svg>
              </div>
              
              {/* Target line (85% OEE) */}
              <div className="absolute left-0 right-0 h-0.5 bg-green-500/50"
                   style={{ bottom: '15%' }} />
              
              {/* Axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between items-center w-4">
                <div className="text-xs text-slate-400">1.00</div>
                <div className="text-xs text-slate-400">0.85</div>
                <div className="text-xs text-slate-400">0.70</div>
                <div className="text-xs text-slate-400">0.50</div>
                <div className="text-xs text-slate-400">0.25</div>
                <div className="text-xs text-slate-400">0.00</div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                {trendData.map((point, index) => 
                  index % Math.max(1, Math.floor(trendData.length / 6)) === 0 ? (
                    <div key={index} className="text-xs text-slate-500 w-full text-center">
                      {new Date(point.date).toLocaleTimeString('es-ES', {
                        hour: timeRange === 'day' ? '2-digit' : undefined,
                        month: timeRange === 'week' || timeRange === 'month' ? '2-digit' : undefined,
                        day: timeRange === 'week' || timeRange === 'month' ? '2-digit' : undefined
                      })}
                    </div>
                  ) : null
                )}
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
              <div className="space-y-2">
                {workstationRanking.slice(0, 8).map((ws, index) => (
                  <div key={ws.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full 
                                   ${ws.oee < 0.7 ? 'bg-red-500' : 
                                     ws.oee < 0.8 ? 'bg-amber-500' : 
                                     'bg-green-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <div className="font-medium">{ws.name}</div>
                        <div className="text-slate-600">#{index + 1}</div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <div>OEE: {(ws.oee * 100).toFixed(1)}%</div>
                        <div className="flex-1">
                          <div className="h-1.5 w-full bg-slate-200/50 rounded-full">
                            <div 
                              className={`h-full w-[${ws.oee * 100}%] 
                                       ${ws.oee < 0.7 ? 'bg-red-500' : 
                                        ws.oee < 0.8 ? 'bg-amber-500' : 
                                        'bg-green-500'} rounded-full`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                Pérdidas totales: {(1 - calculatedOee) * 100}%
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
                          className={`h-full w-[${loss.value * 100}%] ${loss.color} rounded-full`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {!sixBigLosses.length && (
                  <div className="text-center py-8 text-slate-500">
                    OEE óptimo - sin pérdidas significativas
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
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Producido</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Defectos</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">T. Prod.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">T. Paro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workstationRanking.map((ws, index) => (
                    <tr key={ws.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">{ws.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-500">{ws.code}</td>
                      <td className="px-4 py-2 text-right text-sm font-bold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ws.oee >= 0.85 ? 'bg-green-100 text-green-700' : ws.oee >= 0.7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {(ws.oee * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">{(ws.availability * 100).toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">{(ws.performance * 100).toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">{(ws.quality * 100).toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">{ws.totalProduced.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-sm text-red-600">{ws.totalDefects.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">{(ws.productionTimeMs / 3600000).toFixed(1)}h</td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">{ws.downtimeMs > 0 ? (ws.downtimeMs / 3600000).toFixed(1) + 'h' : '-'}</td>
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