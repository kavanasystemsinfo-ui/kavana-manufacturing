import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';
import { useMemo } from 'react';

interface DailyProduction {
  date: string;
  produced: number;
  target: number;
  defect: number;
}

export function ProductionChart() {
  const { orders } = useSupervisorPanel();
  
  // Mock data for 30 days - in reality this would come from an analytics endpoint
  const mockData: DailyProduction[] = useMemo(() => {
    const data: DailyProduction[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Simulate some variance in production
      const baseTarget = 15000;
      const variance = Math.random() * 4000 - 1000; // ±2000
      const target = baseTarget + variance;
      
      // Production is usually 85-110% of target
      const produced = target * (0.85 + Math.random() * 0.25);
      
      // Defects are typically 1-5% of production
      const defect = produced * (0.01 + Math.random() * 0.04);
      
      data.push({
        date: date.toISOString().split('T')[0],
        produced: Math.round(produced),
        target: Math.round(target),
        defect: Math.round(defect)
      });
    }
    
    return data;
  }, []);
  
  // Calculate weekly average for trend line
  const weeklyAvg = useMemo(() => {
    if (mockData.length < 7) return 0;
    const lastWeek = mockData.slice(-7);
    const sum = lastWeek.reduce((acc, day) => acc + day.produced, 0);
    return sum / 7;
  }, [mockData]);
  
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Producción Diaria (Últimos 30 días)
        </h3>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-green-600 font-medium">
            Promedio semanal: {Math.round(weeklyAvg)} unidades/día
          </span>
          <span className="text-slate-500">
            ({new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })})
          </span>
        </div>
      </div>
      
      {/* In a real implementation, we would use a chart library like Chart.js or Recharts */}
      {/* For now, we'll show a simple bar chart using divs */}
      <div className="h-48 relative">
        {/* Grid lines */}
        <div className="absolute inset-0 grid grid-cols-30 grid-rows-4 gap-0.5">
          {[...Array(4)].map((_, rowIndex) => (
            <div key={rowIndex} className="col-span-1 border-r border-slate-200/50" />
          ))}
          {[...Array(30)].map((_, colIndex) => (
            <div key={colIndex} className="row-span-4 border-b border-slate-200/50" />
          ))}
        </div>
        
        {/* Target line */}
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-indigo-500/50" />
        
        {/* Weekly average line */}
        <div 
          className="absolute left-0 right-0 bottom-0 h-0.5 bg-green-500/50"
          style={{ bottom: `${(weeklyAvg / 20000) * 100}%` }}
        />
        
        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1 px-2">
          {mockData.map((day, index) => {
            const height = Math.min((day.produced / 20000) * 100, 95); // Cap at 95%
            const targetHeight = Math.min((day.target / 20000) * 100, 95);
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                {/* Target bar (outline) */}
                <div 
                  className={`w-4 h-[${targetHeight}%] bg-slate-200/50 rounded-t`}
                />
                
                {/* Actual production bar */}
                <div 
                  className={`w-4 h-[${height}%] bg-kavana-orange rounded-t`}
                />
                
                {/* Defect overlay (if any) */}
                {day.defect > 0 && (
                  <div 
                    className={`w-4 h-[${(day.defect / day.produced) * height}%] bg-red-500/30 rounded-t`}
                    style={{ bottom: `${height}%` }}
                  />
                )}
                
                {/* Date label */}
                <div className="text-xs text-slate-500 transform -rotate-45">
                  {new Date(day.date).toLocaleDateString('es-ES', { day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between items-center w-4">
          <div className="text-xs text-slate-400">20k</div>
          <div className="text-xs text-slate-400">10k</div>
          <div className="text-xs text-slate-400">0</div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex mt-3 gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-kavana-orange rounded" />
          <span>Producción</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-slate-200/50 rounded" />
          <span>Objetivo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500/30 rounded" />
          <span>Defectos</span>
        </div>
      </div>
    </div>
  );
}