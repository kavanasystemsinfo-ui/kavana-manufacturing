import type { ActivityBlock } from '../api/supervisor.js';

const typeLabel: Record<string, string> = {
  produccion: 'Producción',
  parada: 'Parada',
};

const typeColor: Record<string, string> = {
  produccion: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40',
  parada: 'bg-rose-500/20 text-rose-300 ring-rose-500/40',
};

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  activity: ActivityBlock[];
}

export function ActivityFeed({ activity }: Props) {
  if (activity.length === 0) {
    return (
      <div className="py-6 text-center text-slate-500 text-sm">
        Sin actividad registrada
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activity.map((block) => (
        <div key={block.id} className="flex items-start gap-3">
          <div className="mt-1 flex h-3 w-3 shrink-0 rounded-full bg-slate-600 ring-2 ring-slate-500/40" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${typeColor[block.type] ?? 'bg-slate-500/20 text-slate-300 ring-slate-500/40'}`}>
                {typeLabel[block.type] ?? block.type}
              </span>
              <span className="text-xs text-slate-400">
                {formatTime(block.start_time)} — {formatTime(block.end_time)}
              </span>
              <span className="text-xs text-slate-500">
                ({formatDuration(block.start_time, block.end_time)})
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-white">{block.operator_name}</p>
            {block.type === 'produccion' && (
              <p className="text-xs text-slate-400">
                Producido: {block.produced_quantity ?? 0} · Defectos: {block.defect_quantity ?? 0}
              </p>
            )}
            {block.type === 'parada' && block.downtime_reason && (
              <p className="text-xs text-rose-400/80">Motivo: {block.downtime_reason}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
