import { workstationBadge } from '../utils/workstation-badge.js';

/** Lo que devuelve GET /orders/workstations-status: entidad + semáforo derivado. */
export interface WorkstationLive {
  id: string;
  name: string;
  code: string;
  status: string;
  state?: string | null;
  last_block_type?: string | null;
  last_block_start?: string | null;
  last_block_end?: string | null;
  operator_name?: string | null;
}

function formatTime(ts: string | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  workstations: WorkstationLive[];
}

/**
 * Tablero de puestos con su estado real.
 *
 * El semáforo lo deriva el backend (workstation-state.ts) y llega ya resuelto:
 * antes esta pantalla lo calculaba con `ws.last_block_type`, un campo que
 * /workstations no devuelve, así que el punto salía siempre verde mientras el
 * puesto estuviera dado de alta. Parecía un indicador en vivo y nunca cambiaba.
 */
export function WorkstationBoard({ workstations }: Props) {
  if (workstations.length === 0) {
    return <div className="py-12 text-center text-slate-500">No hay puestos activos</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workstations.map((ws) => {
        const badge = workstationBadge(ws.state);
        const ultima = ws.last_block_end ?? ws.last_block_start;
        return (
          <div key={ws.id} className={`rounded-xl border-2 p-5 transition ${badge.chip}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-white">{ws.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 shrink-0 rounded-full ${badge.dot}`} aria-hidden="true" />
                <span className="text-xs font-bold">{badge.label}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-400">{ws.code}</p>
            {ws.operator_name && (
              <p className="mt-2 text-sm text-slate-300">
                Operario: <span className="font-medium text-white">{ws.operator_name}</span>
              </p>
            )}
            {ultima && <p className="mt-1 text-xs text-slate-400">Última actividad: {formatTime(ultima)}</p>}
          </div>
        );
      })}
    </div>
  );
}
