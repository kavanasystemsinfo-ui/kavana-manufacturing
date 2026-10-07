import { useEffect, useState } from 'react';
import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';
import { fetchOeeWorkstations } from '../api/analytics.js';

interface KpiCard {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  onClick?: () => void;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function KpiCardsRow() {
  const {
    orders,
    incidencias,
    incidenciasLoading,
    incidenciasError,
    filters,
    setFilters,
  } = useSupervisorPanel();

  // Calculate KPI values
  const totalWo = orders.length;
  const activeWo = orders.filter(o => o.status === 'in_progress').length;
  const completedWo = orders.filter(o => o.status === 'completed').length;
  const blockedWo = orders.filter(o => o.status === 'cancelled').length; // Using cancelled as blocked for demo
  
  // Count open issues (incidencias that are not resolved)
  const openIssues = incidencias.filter(i => 
    !incidenciasLoading && !incidenciasError && 
    (i.status === 'abierto' || i.status === 'en_progreso')
  ).length;
  
  // Count blocking issues (issues that are stopping production)
  const blockingIssues = incidencias.filter(i => 
    !incidenciasLoading && !incidenciasError && 
    i.status === 'abierto' && 
    (i.type === 'mantenimiento' || i.type === 'seguridad')
  ).length;
  
  // OEE de planta hoy: media de los puestos que sí tienen partes en el día.
  // Antes salía de Math.random() y cambiaba en cada render; ahora sale del
  // endpoint de OEE y, sin datos, se muestra un guion en vez de un número
  // inventado.
  const [plantOee, setPlantOee] = useState<number | null>(null);

  useEffect(() => {
    const ahora = new Date();
    const inicioDelDia = new Date(ahora);
    inicioDelDia.setHours(0, 0, 0, 0);

    let cancelado = false;
    fetchOeeWorkstations(inicioDelDia.toISOString(), ahora.toISOString())
      .then((puestos) => {
        if (cancelado) return;
        const conDatos = puestos.filter((p) => !p.sin_datos);
        if (conDatos.length === 0) {
          setPlantOee(null);
          return;
        }
        const media = conDatos.reduce((suma, p) => suma + (Number(p.oee) || 0), 0) / conDatos.length;
        setPlantOee(media);
      })
      .catch(() => {
        if (!cancelado) setPlantOee(null);
      });

    return () => { cancelado = true; };
  }, []);

  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => {
          setFilters({ ...filters, status: [] });
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${filters.status.length === 0 ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        Total WO
        <div className="text-2xl font-bold mt-1">{totalWo}</div>
      </button>
      
      <button
        onClick={() => {
          setFilters({ ...filters, status: ['in_progress'] });
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${filters.status.includes('in_progress') ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        Activas
        <div className="text-2xl font-bold mt-1">{activeWo}</div>
        <div className="text-xs text-slate-500">En proceso</div>
      </button>
      
      <button
        onClick={() => {
          setFilters({ ...filters, status: ['completed'] });
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${filters.status.includes('completed') ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        Completadas
        <div className="text-2xl font-bold mt-1">{completedWo}</div>
        <div className="text-xs text-slate-500">Histórico</div>
      </button>
      
      <button
        onClick={() => {
          setFilters({ ...filters, status: ['cancelled'] });
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${filters.status.includes('cancelled') ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        Bloqueadas
        <div className="text-2xl font-bold mt-1">{blockedWo}</div>
        <div className="text-xs text-slate-500">Canceladas</div>
      </button>
      
      <button
        onClick={() => {
          // Filter for open issues
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition bg-red-500 text-white hover:bg-red-600`}
      >
        Issues Abiertas
        <div className="text-2xl font-bold mt-1">{openIssues}</div>
        <div className="text-xs text-slate-500">Pendientes</div>
      </button>
      
      <button
        onClick={() => {
          // Filter for blocking issues
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition bg-red-600 text-white hover:bg-red-700`}
      >
        Issues Bloqueantes
        <div className="text-2xl font-bold mt-1">{blockingIssues}</div>
        <div className="text-xs text-slate-500">Urgentes</div>
      </button>
      
      <button
        onClick={() => {
          // Show OEE detail
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition bg-indigo-500 text-white hover:bg-indigo-600`}
      >
        OEE Planta
        <div className="text-2xl font-bold mt-1">
          {plantOee === null ? '—' : `${plantOee.toFixed(1)}%`}
        </div>
        <div className="text-xs text-slate-500">
          {plantOee === null ? 'Sin datos hoy' : 'Promedio'}
        </div>
      </button>
    </div>
  );
}