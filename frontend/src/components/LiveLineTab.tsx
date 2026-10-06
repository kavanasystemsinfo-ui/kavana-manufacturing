import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';
import { useEffect, useState } from 'react';

interface WorkstationStatus {
  id: string;
  name: string;
  code: string;
  status: 'running' | 'idle' | 'down' | 'maintenance' | 'changeover';
  currentOrderId?: string;
  currentOrderCode?: string;
  targetQuantity?: number;
  producedQuantity?: number;
  oee?: number;
  lastUpdate?: string;
}

interface TimelineBlock {
  start: number; // minutes from shift start
  end: number;
  type: 'running' | 'idle' | 'down' | 'changeover';
  label?: string;
}

export function LiveLineTab() {
  const { workstationStatus, orders } = useSupervisorPanel();
  const [liveData, setLiveData] = useState<Map<string, WorkstationStatus>>(new Map());
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time updates every 10 seconds
  useEffect(() => {
    const updateLiveData = () => {
      const newData = new Map<string, WorkstationStatus>();
      
      workstationStatus.forEach(ws => {
        // Determine current status with some realistic variation
        const statuses: WorkstationStatus['status'][] = ['running', 'idle', 'down', 'changeover'];
        const weights = [0.6, 0.2, 0.1, 0.1]; // 60% running, 20% idle, 10% down, 10% changeover
        
        let random = Math.random();
        let selectedStatus: WorkstationStatus['status'] = 'running';
        let cumulative = 0;
        for (let i = 0; i < weights.length; i++) {
          cumulative += weights[i];
          if (random <= cumulative) {
            selectedStatus = statuses[i];
            break;
          }
        }
        
        // Find current order for this workstation
        const currentOrder = orders.find(o => o.workstation_id === ws.id && o.status === 'in_progress');
        
        // Generate timeline blocks for the current shift (8 hours = 480 minutes)
        const timelineBlocks: TimelineBlock[] = generateShiftTimeline(selectedStatus, currentOrder);
        
        newData.set(ws.id, {
          id: ws.id,
          name: ws.name,
          code: ws.code,
          status: selectedStatus,
          currentOrderId: currentOrder?.id,
          currentOrderCode: currentOrder?.code,
          targetQuantity: currentOrder?.quantity,
          producedQuantity: currentOrder?.produced_quantity || 0,
          oee: 0.65 + Math.random() * 0.3, // 65-95%
          lastUpdate: new Date().toISOString()
        });
      });
      
      setLiveData(newData);
      setLastPoll(new Date());
      setIsLive(true);
    };
    
    // Initial load
    updateLiveData();
    
    // Poll every 10 seconds
    const interval = setInterval(updateLiveData, 10000);
    
    // Mark as stale after 30 seconds without update
    const staleInterval = setInterval(() => {
      if (lastPoll && Date.now() - lastPoll.getTime() > 30000) {
        setIsLive(false);
      }
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(staleInterval);
    };
  }, [workstationStatus, orders]);

  // Generate a realistic shift timeline based on current status
  function generateShiftTimeline(currentStatus: WorkstationStatus['status'], currentOrder?: any): TimelineBlock[] {
    const blocks: TimelineBlock[] = [];
    const shiftMinutes = 480; // 8 hour shift
    let currentTime = 0;
    
    // Simulate a typical shift pattern
    const patterns = [
      { type: 'running' as const, minDuration: 60, maxDuration: 180 },
      { type: 'idle' as const, minDuration: 10, maxDuration: 30 },
      { type: 'changeover' as const, minDuration: 15, maxDuration: 45 },
      { type: 'down' as const, minDuration: 20, maxDuration: 120 }
    ];
    
    while (currentTime < shiftMinutes) {
      // Bias towards current status for the current period
      let pattern;
      if (currentTime > shiftMinutes - 60) {
        // Last hour - likely running or winding down
        pattern = { type: currentStatus, minDuration: 30, maxDuration: 60 };
      } else {
        const rand = Math.random();
        if (rand < 0.5) pattern = patterns[0];
        else if (rand < 0.7) pattern = patterns[1];
        else if (rand < 0.85) pattern = patterns[2];
        else pattern = patterns[3];
      }
      
      const duration = pattern.minDuration + Math.random() * (pattern.maxDuration - pattern.minDuration);
      const endTime = Math.min(currentTime + duration, shiftMinutes);
      
      if (endTime > currentTime) {
        blocks.push({
          start: currentTime,
          end: endTime,
          type: pattern.type,
          label: pattern.type === 'running' && currentOrder ? currentOrder.code : undefined
        });
      }
      
      currentTime = endTime;
    }
    
    return blocks;
  }

  // Format minutes to HH:MM
  function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Get status color
  function getStatusColor(status: WorkstationStatus['status']): string {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'idle': return 'bg-slate-400';
      case 'down': return 'bg-red-500';
      case 'changeover': return 'bg-amber-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  }

  function getStatusLabel(status: WorkstationStatus['status']): string {
    switch (status) {
      case 'running': return 'Produciendo';
      case 'idle': return 'En espera';
      case 'down': return 'Parado';
      case 'changeover': return 'Cambio';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Desconocido';
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with LIVE badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Línea en Vivo</h3>
          <p className="text-sm text-slate-500">Monitoreo en tiempo real del turno actual</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            isLive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {isLive ? 'LIVE' : 'STALE'}
          </div>
          {lastPoll && (
            <span className="text-xs text-slate-500">
              Actualizado: {lastPoll.toLocaleTimeString('es-ES')}
            </span>
          )}
        </div>
      </div>

      {/* Time axis */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
        <div className="flex">
          {/* Workstation labels column */}
          <div className="w-48 flex-shrink-0 border-r border-slate-200">
            <div className="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-50 border-b border-slate-200">
              PUESTO
            </div>
          </div>
          
          {/* Timeline column */}
          <div className="flex-1 min-w-[800px] relative">
            {/* Hour markers */}
            <div className="absolute inset-0 flex">
              {[0, 60, 120, 180, 240, 300, 360, 420, 480].map((hour, i) => (
                <div 
                  key={i}
                  className="flex-1 border-r border-slate-200/50 relative"
                  style={{ width: `${(hour / 480) * 100}%` }}
                >
                  <div className="absolute top-0 left-0 -translate-x-1/2 text-xs text-slate-400">
                    {formatTime(hour)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Current time indicator */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 pointer-events-none"
                 style={{ left: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 480) * 100}%` }}>
              <div className="absolute top-0 w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
            </div>
            
            {/* Workstation timelines */}
            <div className="relative">
              {Array.from(liveData.entries()).map(([id, ws]) => {
                const blocks = generateShiftTimeline(ws.status, ws.currentOrderId ? { code: ws.currentOrderCode } : undefined);
                
                return (
                  <div key={id} className="h-20 border-b border-slate-200/50 relative group">
                    {/* Workstation info */}
                    <div className="absolute left-0 top-0 w-48 h-20 flex items-center px-2 bg-slate-50/50 border-r border-slate-200/50">
                      <div className="w-full">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(ws.status)}`}></span>
                          <span className="text-sm font-medium text-slate-900 truncate">{ws.name}</span>
                        </div>
                        <div className="text-xs text-slate-500">{ws.code}</div>
                        {ws.currentOrderCode && (
                          <div className="text-xs text-kavana-orange mt-0.5">
                            📦 {ws.currentOrderCode}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Timeline bars */}
                    <div className="absolute left-48 right-0 top-0 bottom-0 flex items-center">
                      <div className="flex h-6 gap-1">
                        {blocks.map((block, idx) => {
                          const widthPercent = ((block.end - block.start) / 480) * 100;
                          const leftPercent = (block.start / 480) * 100;
                          
                          return (
                            <div
                              key={idx}
                              className={`h-full ${getStatusColor(block.type)} rounded-sm transition-all cursor-pointer`}
                              style={{ 
                                width: `${widthPercent}%`,
                                minWidth: '2px'
                              }}
                              title={`${getStatusLabel(block.type)}: ${formatTime(block.start)} - ${formatTime(block.end)}${block.label ? ` | ${block.label}` : ''}`}
                            >
                              {widthPercent > 15 && block.label && (
                                <span className="text-[10px] text-white/90 truncate px-1 whitespace-nowrap">
                                  {block.label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* KPI badges on the right */}
                    <div className="absolute right-0 top-0 w-40 h-20 flex items-center justify-end px-2 gap-1">
                      <div className="flex flex-col items-end gap-1">
                        {ws.targetQuantity && ws.producedQuantity !== undefined && (
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Progreso</div>
                            <div className="text-sm font-bold text-slate-900">
                              {ws.producedQuantity.toLocaleString()} / {ws.targetQuantity.toLocaleString()}
                            </div>
                            <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-0.5">
                              <div 
                                className="h-full bg-kavana-orange rounded-full"
                                style={{ width: `${Math.min((ws.producedQuantity / ws.targetQuantity) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {ws.oee !== undefined && (
                          <div className="text-right">
                            <div className="text-xs text-slate-500">OEE</div>
                            <div className={`text-sm font-bold ${ws.oee > 0.85 ? 'text-green-600' : ws.oee > 0.7 ? 'text-amber-600' : 'text-red-600'}`}>
                              {(ws.oee * 100).toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Hover detail */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 z-10" />
                  </div>
                );
              })}
              
              {liveData.size === 0 && (
                <div className="h-48 flex items-center justify-center text-slate-500">
                  No hay puestos configurados
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shift Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Running */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Produciendo</p>
              <p className="text-2xl font-bold text-green-600">
                {Array.from(liveData.values()).filter(ws => ws.status === 'running').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Idle */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">En espera</p>
              <p className="text-2xl font-bold text-slate-600">
                {Array.from(liveData.values()).filter(ws => ws.status === 'idle').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Down */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Parados</p>
              <p className="text-2xl font-bold text-red-600">
                {Array.from(liveData.values()).filter(ws => ws.status === 'down').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Avg OEE */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">OEE Promedio</p>
              <p className="text-2xl font-bold text-indigo-600">
                {liveData.size > 0 ? 
                  (Array.from(liveData.values()).reduce((sum, ws) => sum + (ws.oee || 0), 0) / liveData.size * 100).toFixed(1) + '%' : 
                  'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Current Orders Detail */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-900">Órdenes en Progreso</h4>
        </div>
        <div className="divide-y divide-slate-200">
          {Array.from(liveData.entries())
            .filter(([, ws]) => ws.currentOrderId)
            .map(([id, ws]) => (
              <div key={id} className="px-4 py-3 hover:bg-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(ws.status)}`}></div>
                    <div>
                      <p className="font-medium text-slate-900">{ws.name} ({ws.code})</p>
                      <p className="text-sm text-slate-500">Orden: {ws.currentOrderCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {ws.targetQuantity && ws.producedQuantity !== undefined && (
                      <div className="text-right">
                        <p className="text-slate-500">Producido</p>
                        <p className="font-semibold text-slate-900">
                          {ws.producedQuantity.toLocaleString()} / {ws.targetQuantity.toLocaleString()}
                          ({(ws.producedQuantity / ws.targetQuantity * 100).toFixed(1)}%)
                        </p>
                      </div>
                    )}
                    {ws.oee !== undefined && (
                      <div className="text-right">
                        <p className="text-slate-500">OEE</p>
                        <p className={`font-semibold ${ws.oee > 0.85 ? 'text-green-600' : ws.oee > 0.7 ? 'text-amber-600' : 'text-red-600'}`}>
                          {(ws.oee * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-slate-500">Estado</p>
                      <p className="font-semibold text-slate-900 capitalize">{getStatusLabel(ws.status)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          
          {Array.from(liveData.entries()).filter(([, ws]) => !ws.currentOrderId).length === liveData.size && (
            <div className="px-4 py-8 text-center text-slate-500">
              No hay órdenes en progreso en este momento
            </div>
          )}
        </div>
      </div>
    </div>
  );
}