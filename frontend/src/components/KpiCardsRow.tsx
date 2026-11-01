import { useSupervisorPanel } from '../hooks/useSupervisorPanel.js';
import { usePlantOee } from '../hooks/usePlantOee.js';
import { contarIncidencias } from '../utils/estado-planta.js';
import { conteosDeOrdenes } from '../utils/resumen-conteos.js';

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
    statusCounts,
    incidencias,
    incidenciasLoading,
    incidenciasError,
    filters,
    setFilters,
  } = useSupervisorPanel();

  // Calculate KPI values
  const conteos = conteosDeOrdenes(statusCounts, orders);
  const totalWo = conteos.total;
  const activeWo = conteos.enProceso;
  const completedWo = conteos.completadas;
  const blockedWo = conteos.canceladas;
  
  // Incidencias: abiertas = sin resolver; bloqueantes = abiertas de mantenimiento o seguridad.
  const { abiertas: openIssues, bloqueantes: blockingIssues } = contarIncidencias(
    incidenciasLoading || incidenciasError ? [] : incidencias,
  );

  // OEE de planta hoy (sin datos: guion, nunca un número inventado).
  const plantOee = usePlantOee();

  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button
        title="Todas las órdenes de producción registradas: pendientes, en marcha, completadas y canceladas."
        onClick={() => {
          setFilters({ ...filters, status: [] });
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${filters.status.length === 0 ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        Órdenes
        <div className="text-2xl font-bold mt-1">{totalWo}</div>
        <div className="text-xs text-slate-500">En total</div>
      </button>
      
      <button
        title="Órdenes que se están fabricando ahora mismo."
        onClick={() => {
          setFilters({ ...filters, status: ['in_progress'] });
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${filters.status.includes('in_progress') ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        En marcha
        <div className="text-2xl font-bold mt-1">{activeWo}</div>
        <div className="text-xs text-slate-500">Fabricándose ahora</div>
      </button>
      
      <button
        title="Órdenes ya terminadas, de todo el histórico."
        onClick={() => {
          setFilters({ ...filters, status: ['completed'] });
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${filters.status.includes('completed') ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        Completadas
        <div className="text-2xl font-bold mt-1">{completedWo}</div>
        <div className="text-xs text-slate-500">Ya terminadas</div>
      </button>
      
      <button
        title="Órdenes que se anularon antes de terminarse."
        onClick={() => {
          setFilters({ ...filters, status: ['cancelled'] });
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${filters.status.includes('cancelled') ? 'bg-kavana-orange text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        Canceladas
        <div className="text-2xl font-bold mt-1">{blockedWo}</div>
        <div className="text-xs text-slate-500">Anuladas</div>
      </button>
      
      <button
        title="Incidencias de calidad, mantenimiento o seguridad que siguen sin resolverse."
        onClick={() => {
          // Filter for open issues
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition bg-red-500 text-white hover:bg-red-600`}
      >
        Incidencias abiertas
        <div className="text-2xl font-bold mt-1">{openIssues}</div>
        <div className="text-xs text-slate-500">Sin resolver</div>
      </button>
      
      <button
        title="Incidencias abiertas de mantenimiento o seguridad: pueden parar o poner en riesgo la producción."
        onClick={() => {
          // Filter for blocking issues
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition bg-red-600 text-white hover:bg-red-700`}
      >
        Incidencias bloqueantes
        <div className="text-2xl font-bold mt-1">{blockingIssues}</div>
        <div className="text-xs text-slate-500">Urgentes</div>
      </button>
      
      <button
        title="OEE: qué parte del tiempo y de la capacidad de la planta se convierte en producto bueno. Resulta de disponibilidad × rendimiento × calidad. Objetivo: 85 %."
        onClick={() => {
          // Show OEE detail
        }}
        className={`min-h-[64px] flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition bg-indigo-500 text-white hover:bg-indigo-600`}
      >
        Eficiencia (OEE)
        <div className="text-2xl font-bold mt-1">
          {plantOee === null ? '—' : `${plantOee.toFixed(1)}%`}
        </div>
        <div className="text-xs text-slate-500">
          {plantOee === null ? 'Sin datos hoy' : 'De la planta, hoy'}
        </div>
      </button>
    </div>
  );
}