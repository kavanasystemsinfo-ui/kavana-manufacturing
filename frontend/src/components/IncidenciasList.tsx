import type { Incidencia } from '../api/admin-entities.js';

interface Props {
  incidencias: Incidencia[];
  loading: boolean;
  error: string | null;
  isClassic?: boolean;
}

const sevLabels: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

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

// Dark (panel estándar)
const sevDark: Record<string, string> = {
  critica: 'bg-red-500/20 text-red-300 ring-red-500/40',
  alta: 'bg-orange-500/20 text-orange-300 ring-orange-500/40',
  media: 'bg-amber-500/20 text-amber-300 ring-amber-500/40',
  baja: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
};

const statusDark: Record<string, string> = {
  abierto: 'bg-red-500/20 text-red-300 ring-red-500/40',
  en_progreso: 'bg-blue-500/20 text-blue-300 ring-blue-500/40',
  resuelto: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40',
  cerrado: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
};

// Classic (tema claro)
const sevClassic: Record<string, string> = {
  critica: 'bg-red-100 text-red-800 border-red-300',
  alta: 'bg-orange-100 text-orange-800 border-orange-300',
  media: 'bg-amber-100 text-amber-800 border-amber-300',
  baja: 'bg-slate-100 text-slate-600 border-slate-300',
};

const statusClassic: Record<string, string> = {
  abierto: 'bg-red-100 text-red-800 border-red-300',
  en_progreso: 'bg-blue-100 text-blue-800 border-blue-300',
  resuelto: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cerrado: 'bg-slate-100 text-slate-600 border-slate-300',
};

export function IncidenciasList({ incidencias, loading, error, isClassic }: Props) {
  const sev = isClassic ? sevClassic : sevDark;
  const status = isClassic ? statusClassic : statusDark;
  const card = isClassic
    ? 'rounded-lg border border-slate-200 bg-white shadow-sm'
    : 'rounded-xl border-2 border-kavana-steel/20 bg-kavana-surface';
  const titleCls = isClassic ? 'font-semibold text-slate-900' : 'font-bold text-white';
  const metaCls = isClassic ? 'text-xs text-slate-500' : 'text-xs text-slate-400';
  const descCls = isClassic ? 'text-sm text-slate-600' : 'text-sm text-slate-300';

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
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${sev[inc.severity] || sev.baja}`}>
              {sevLabels[inc.severity] || inc.severity}
            </span>
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
              <p className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${isClassic ? 'text-slate-500' : 'text-slate-500'}`}>
                📷 Evidencia fotográfica
              </p>
              <img
                src={inc.photo_data_url}
                alt="Evidencia de la incidencia"
                className={`max-h-44 w-full rounded-lg border object-cover ${isClassic ? 'border-slate-200' : 'border-kavana-steel/20'}`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
