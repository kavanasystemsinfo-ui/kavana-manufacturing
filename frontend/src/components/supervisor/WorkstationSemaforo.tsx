import { workstationBadge } from '../../utils/workstation-badge.js';

export interface WorkstationStatusLike {
  id: string;
  name: string;
  code: string;
  state?: string | null;
  last_block_type?: string | null;
  operator_name?: string | null;
}

interface WorkstationSemaforoProps {
  workstations: WorkstationStatusLike[];
  /** Texto del pie: deja claro que el dato se refresca solo. */
  refreshLabel?: string;
}

/**
 * Semáforo del estado de cada puesto.
 *
 * Los datos ya se recargan solos cada 10 s desde el store del supervisor; lo
 * que faltaba era pintarlos. Se ordena por gravedad (parada, en marcha, sin
 * actividad) para que lo que requiere atención quede a la izquierda.
 */
export function WorkstationSemaforo({ workstations, refreshLabel }: WorkstationSemaforoProps) {
  if (workstations.length === 0) return null;

  const order: Record<string, number> = { stopped: 0, running: 1, idle: 2 };
  const sorted = [...workstations].sort(
    (a, b) => (order[a.state ?? 'idle'] ?? 3) - (order[b.state ?? 'idle'] ?? 3) || a.name.localeCompare(b.name),
  );

  const paradas = workstations.filter((w) => w.state === 'stopped').length;

  return (
    <section aria-label="Estado de los puestos" className="mb-6 rounded-2xl border border-kavana-steel/20 bg-kavana-surface/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-kavana-steel">Estado de los puestos</p>
        <p className="text-[11px] text-slate-400">
          {paradas > 0 ? `${paradas} en parada · ` : ''}
          {refreshLabel ?? 'Se actualiza solo'}
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {sorted.map((w) => {
          const badge = workstationBadge(w.state);
          return (
            <li
              key={w.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${badge.chip}`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${badge.dot}`} aria-hidden="true" />
              <span className="text-white">{w.name}</span>
              <span className="text-slate-400">{w.code}</span>
              <span>{badge.label}</span>
              {w.operator_name && <span className="text-slate-400">· {w.operator_name}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
