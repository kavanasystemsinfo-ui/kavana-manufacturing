import type { Workstation } from '../api/supervisor.js';

const statusColor: Record<string, string> = {
  produccion: 'border-emerald-500 bg-emerald-500/10',
  parada: 'border-rose-500 bg-rose-500/10',
  active: 'border-slate-500 bg-slate-500/10',
  inactive: 'border-slate-700 bg-slate-800/50 opacity-50',
};

const statusDot: Record<string, string> = {
  produccion: 'bg-emerald-400',
  parada: 'bg-rose-400',
  active: 'bg-slate-400',
  inactive: 'bg-slate-600',
};

const statusLabel: Record<string, string> = {
  produccion: 'En producción',
  parada: 'Parada',
  active: 'Libre',
  inactive: 'Inactivo',
};

function formatTime(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  workstations: Workstation[];
}

export function WorkstationBoard({ workstations }: Props) {
  if (workstations.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        No hay puestos activos
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workstations.map((ws) => {
        const state = ws.last_block_type ?? (ws.status === 'active' ? 'active' : 'inactive');
        return (
          <div
            key={ws.id}
            className={`rounded-xl border-2 p-5 transition ${statusColor[state] ?? statusColor.active}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{ws.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${statusDot[state] ?? statusDot.active}`} />
                <span className="text-xs font-medium text-slate-300">
                  {statusLabel[state] ?? state}
                </span>
              </div>
            </div>
            {ws.operator_name && (
              <p className="mt-2 text-sm text-slate-300">
                Operario: <span className="font-medium text-white">{ws.operator_name}</span>
              </p>
            )}
            {ws.last_block_start && (
              <p className="mt-1 text-xs text-slate-400">
                Última actividad: {formatTime(ws.last_block_start)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
