import type { Incidencia } from '../api/admin-entities.js';
import { IncidenciaPhoto } from './IncidenciaPhoto.js';

interface Props {
  incidencias: Incidencia[];
  loading: boolean;
  error: string | null;
  isClassic?: boolean;
  onStatusChange?: (id: string, status: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const statusLabels: Record<string, string> = {
  abierto: 'Abierta',
  en_progreso: 'En progreso',
  resuelto: 'Resuelta',
  cerrado: 'Cerrada',
};

const typeLabels: Record<string, string> = {
  calidad: 'Calidad',
  seguridad: 'Seguridad',
  mantenimiento: 'Mantenimiento',
  produccion: 'Producción',
  otro: 'Otro',
};

const statusDark: Record<string, string> = {
  abierto: 'bg-red-500/20 text-red-300 ring-red-500/40',
  en_progreso: 'bg-blue-500/20 text-blue-300 ring-blue-500/40',
  resuelto: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40',
  cerrado: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
};

const statusClassic: Record<string, string> = {
  abierto: 'bg-red-100 text-red-800 border-red-300',
  en_progreso: 'bg-blue-100 text-blue-800 border-blue-300',
  resuelto: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cerrado: 'bg-slate-100 text-slate-600 border-slate-300',
};

export function IncidenciasList({ incidencias, loading, error, isClassic, onStatusChange, onDelete }: Props) {
  const status = isClassic ? statusClassic : statusDark;
  const card = isClassic
    ? 'rounded-lg border border-slate-200 bg-white shadow-sm'
    : 'rounded-xl border-2 border-kavana-steel/20 bg-kavana-surface';
  const titleCls = isClassic ? 'font-semibold text-slate-900' : 'font-bold text-white';
  const metaCls = isClassic ? 'text-xs text-slate-500' : 'text-xs text-slate-400';
  const descCls = isClassic ? 'text-sm text-slate-600' : 'text-sm text-slate-300';
  const btnBase = isClassic
    ? 'rounded-full border px-3 py-1 text-xs font-medium transition'
    : 'rounded-full px-3 py-1 text-xs font-bold transition';
  const btnStart = isClassic ? btnBase + ' border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' : btnBase + ' bg-blue-600/20 text-blue-300 hover:bg-blue-600/40';
  const btnResolve = isClassic ? btnBase + ' border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : btnBase + ' bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40';
  const btnClose = isClassic ? btnBase + ' border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100' : btnBase + ' bg-slate-500/20 text-slate-300 hover:bg-slate-500/40';
  const btnDelete = isClassic ? btnBase + ' border-red-300 bg-red-50 text-red-700 hover:bg-red-100' : btnBase + ' bg-red-600/20 text-red-300 hover:bg-red-600/40';

  if (loading) {
    return (
      <div className={`py-16 text-center ${isClassic ? 'text-slate-500' : 'text-slate-400 animate-pulse'}`}>
        Cargando incidencias...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mb-4 rounded-xl border-2 border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-300`}>
        {error}
      </div>
    );
  }

  if (incidencias.length === 0) {
    return (
      <div className={`py-16 text-center ${isClassic ? 'text-slate-500' : 'text-slate-500'}`}>
        No hay incidencias.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {incidencias.map((inc) => (
        <div key={inc.id} className={`p-5 ${card}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm md:text-base ${titleCls}`}>{inc.title}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${status[inc.status] || status.abierto}`}>
              {statusLabels[inc.status] || inc.status}
            </span>
          </div>
          <div className={`mt-1.5 ${metaCls}`}>
            {typeLabels[inc.type] || inc.type} · {new Date(inc.created_at).toLocaleDateString('es-ES')}
          </div>
          {inc.description && (
            <div className={`mt-2 ${descCls}`}>{inc.description}</div>
          )}
          {inc.photo_data_url && (
            <div className="mt-3">
              <IncidenciaPhoto src={inc.photo_data_url} alt="Evidencia de la incidencia" isClassic={isClassic} />
            </div>
          )}
          {(onStatusChange || onDelete) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {onStatusChange && inc.status === 'abierto' && (
                <button onClick={() => void onStatusChange(inc.id, 'en_progreso')} className={btnStart}>Iniciar</button>
              )}
              {onStatusChange && inc.status === 'en_progreso' && (
                <button onClick={() => void onStatusChange(inc.id, 'resuelto')} className={btnResolve}>Resolver</button>
              )}
              {onStatusChange && inc.status === 'resuelto' && (
                <button onClick={() => void onStatusChange(inc.id, 'cerrado')} className={btnClose}>Cerrar</button>
              )}
              {onDelete && (
                <button
                  onClick={() => { if (confirm('¿Eliminar esta incidencia?')) void onDelete(inc.id); }}
                  className={btnDelete}
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
