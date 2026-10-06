import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';
import { useMemo } from 'react';

interface DowntimeReason {
  reason: string;
  hours: number;
  percentage: number;
}

export function DowntimePareto() {
  const { incidencias } = useSupervisorPanel();
  
  // Calculate downtime from incidencias - in reality this would come from a dedicated endpoint
  const downtimeData: DowntimeReason[] = useMemo(() => {
    // Group incidencias by type and calculate downtime hours
    const reasonMap = new Map<string, number>();
    
    incidencias.forEach(inc => {
      // Only count maintenence and quality issues as downtime for demo
      if (inc.type === 'mantenimiento' || inc.type === 'calidad') {
        // Simulate downtime hours based on severity or random for demo
        const hours = 0.5 + Math.random() * 3.5; // 0.5-4 hours per incident
        const current = reasonMap.get(inc.title || inc.type) || 0;
        reasonMap.set(inc.title || inc.type, current + hours);
      }
    });
    
    // Convert to array and sort by hours descending
    const reasons: DowntimeReason[] = Array.from(reasonMap.entries())
      .map(([reason, hours]) => ({
        reason,
        hours,
        percentage: 0 // Will calculate after
      }))
      .sort((a, b) => b.hours - a.hours);
    
    // Calculate percentages
    const totalHours = reasons.reduce((sum, r) => sum + r.hours, 0);
    return reasons.map(r => ({
      ...r,
        percentage: totalHours > 0 ? (r.hours / totalHours) * 100 : 0
    }));
  }, [incidencias]);
  
  // Get top 5 for Pareto
  const top5 = downtimeData.slice(0, 5);
  const otherHours = downtimeData.slice(5).reduce((sum, item) => sum + item.hours, 0);
  
  // Calculate cumulative percentage for Pareto line
  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return top5.map(item => {
      cumulative += item.percentage;
      return {
        ...item,
        cumulative
      };
    });
  }, [top5]);
  
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Pareto de Paradas (Top 5)
        </h3>
        <div className="text-sm text-slate-500">
          {top5.length > 0 ? 
            `Cubre ${Math.round(cumulativeData[cumulativeData.length - 1]?.cumulative || 0)}% del tiempo perdido` : 
            'Sin datos'}
        </div>
      </div>
      
      {/* Pareto chart */}
      <div className="h-48 relative">
        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-2 px-2">
          {cumulativeData.map((item, index) => {
            const height = Math.min((item.percentage / 100) * 90, 90); // Scale to 90% height
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                {/* Bar */}
                <div 
                  className={`w-10 h-[${height}%] bg-amber-400 rounded-t`}
                />
                
                {/* Label */}
                <div 
                  className="text-xs text-slate-600 w-10 text-center"
                  title={item.reason}
                >
                  {item.reason.length > 8 ? 
                    `${item.reason.slice(0, 8)}...` : 
                    item.reason
                  }
                </div>
                
                {/* Percentage value */}
                <div className="text-xs text-slate-800 font-medium">
                  {item.percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
          
          {/* "Other" bar if applicable */}
          {otherHours > 0 && (
            <div className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-10 h-[${(otherHours / (downtimeData.reduce((sum, d) => sum + d.hours, 0) || 1) * 100 / 100 * 90)]}% bg-slate-400 rounded-t"
              />
              <div className="text-xs text-slate-600 w-10 text-center">
                Otros
              </div>
              <div className="text-xs text-slate-800 font-medium">
                {((otherHours / (downtimeData.reduce((sum, d) => sum + d.hours, 0) || 1)) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
        
        {/* Cumulative line */}
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-indigo-500" 
             style={{
               // This is simplified - in reality we'd calculate points for each bar
               // For demo, we'll just show a diagonal line
               background: 'linear-gradient(to right, transparent, bg-indigo-500)'
             }}
        />
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between items-center w-4">
          <div className="text-xs text-slate-400">100%</div>
          <div className="text-xs text-slate-400">80%</div>
          <div className="text-xs text-slate-400">60%</div>
          <div className="text-xs text-slate-400">40%</div>
          <div className="text-xs text-slate-400">20%</div>
          <div className="text-xs text-slate-400">0%</div>
        </div>
        
        {/* X-axis labels (reasons) */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
          {cumulativeData.map((_, index) => (
            <div key={index} className="text-xs text-slate-500 w-10 text-center">
              {index === 0 ? '1' : index === cumulativeData.length - 1 ? String(cumulativeData.length) : ''}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex mt-3 gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-400 rounded" />
          <span>Causas de paro</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-indigo-500" />
          <span>Porcentaje acumulado</span>
        </div>
      </div>
    </div>
  );
}