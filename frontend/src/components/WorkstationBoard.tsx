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
  /** Tema clásico (claro): no sigue el modo oscuro del sistema. */
  isClassic?: boolean;
}

/**
 * Tablero de puestos con su estado real.
 *
 * El semáforo lo deriva el backend (workstation-state.ts) y llega ya resuelto:
 * antes esta pantalla lo calculaba con `ws.last_block_type`, un campo que
 * /workstations no devuelve, así que el punto salía siempre verde mientras el
 * puesto estuviera dado de alta. Parecía un indicador en vivo y nunca cambiaba.
 */
export function WorkstationBoard({ workstations, isClassic }: Props) {
  if (workstations.length === 0) {
    return <div className="py-12 text-center text-slate-500">No hay puestos activos</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workstations.map((ws) => {
        const badge = workstationBadge(ws.state);
        const ultima = ws.last_block_end ?? ws.last_block_start;
        return (
          <div key={ws.id} className={`border rounded-xl shadow p-4 flex flex-col gap-2 ${isClassic ? 'bg-white border-slate-200 text-slate-900' : 'bg-white dark:bg-gray-800'}`}>
            {/* Header with name and status badge */}
            <div className="flex items-start justify-between gap-3">
              <h3 className={`min-w-0 text-lg font-bold ${isClassic ? 'text-slate-900' : 'text-gray-900 dark:text-gray-100'}`}>{ws.name}</h3>
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap pt-1.5">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${badge.dot}`} aria-hidden="true" />
                <span className="text-xs font-medium">{badge.label}</span>
              </div>
            </div>

            {/* Code */}
            {ws.code && (
              <p className={`mt-1 text-xs ${isClassic ? 'text-slate-500' : 'text-gray-500 dark:text-gray-400'}`}>{ws.code}</p>
            )}

            {/* Operator name */}
            {ws.operator_name && (
              <p className={`mt-2 text-sm ${isClassic ? 'text-slate-600' : 'text-gray-600 dark:text-gray-300'}`}>
                Operario: <span className="font-medium">{ws.operator_name}</span>
              </p>
            )}

            {/* Last activity */}
            {ultima && (
              <p className={`mt-1 text-xs ${isClassic ? 'text-slate-500' : 'text-gray-500 dark:text-gray-400'}`}>
                Última actividad: {formatTime(ultima)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}