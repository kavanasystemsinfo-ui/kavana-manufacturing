import { describeBlock, formatMinutes, type OrderSummaryData } from '../../utils/order-summary.js';
import { orderLabel } from '../../utils/order-queue.js';
import { formatPercent } from '../../utils/quick-block.js';

type Variant = 'classic' | 'kavana';

interface Props {
  variant: Variant;
  order: { id: string; code?: string | null };
  productName: string | null;
  workstationName: string | null;
  operatorName: string | null;
  summary: OrderSummaryData;
  busy: boolean;
  onBack: () => void;
  onPause: () => void;
  onResume: () => void;
}

const styles = {
  classic: {
    card: 'mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm',
    back: 'text-sm font-medium text-slate-500 hover:text-kavana-orange',
    code: 'text-xs font-semibold uppercase tracking-wider text-slate-400',
    title: 'mt-1 text-2xl font-bold text-slate-900',
    meta: 'mt-1 text-sm text-slate-500',
    track: 'mt-5 h-3 overflow-hidden rounded-full bg-slate-200',
    bar: 'h-full rounded-full bg-kavana-orange',
    big: 'text-slate-900',
    label: 'text-xs font-medium text-slate-500',
    stat: 'rounded-lg border border-slate-200 bg-slate-50 p-3',
    running: 'bg-emerald-100 text-emerald-700',
    stopped: 'bg-rose-100 text-rose-700',
    pause: 'bg-rose-600 text-white hover:bg-rose-700',
    resume: 'bg-emerald-600 text-white hover:bg-emerald-700',
    listTitle: 'mt-6 text-xs font-bold uppercase tracking-wider text-slate-500',
    row: 'border-b border-slate-100 py-2 text-sm text-slate-700 last:border-0',
    empty: 'mt-2 text-sm text-slate-400',
  },
  kavana: {
    card: 'mb-6 rounded-2xl border-2 border-kavana-orange/40 bg-kavana-dark/70 p-5 shadow-inner',
    back: 'text-sm font-bold text-slate-400 hover:text-kavana-orange',
    code: 'text-sm font-bold uppercase tracking-[0.24em] text-slate-400',
    title: 'mt-2 text-3xl font-black text-white md:text-4xl',
    meta: 'mt-2 text-slate-300',
    track: 'mt-5 h-4 overflow-hidden rounded-full bg-kavana-surface',
    bar: 'h-full rounded-full bg-kavana-orange',
    big: 'text-white',
    label: 'text-xs font-bold uppercase tracking-wider text-slate-400',
    stat: 'rounded-xl border border-kavana-steel/20 bg-kavana-surface/60 p-3',
    running: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40',
    stopped: 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40',
    pause: 'bg-rose-600 text-white hover:bg-rose-500',
    resume: 'bg-emerald-600 text-white hover:bg-emerald-500',
    listTitle: 'mt-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400',
    row: 'border-b border-kavana-steel/20 py-2 text-sm text-slate-300 last:border-0',
    empty: 'mt-2 text-sm text-slate-500',
  },
} as const;

function uds(n: number): string {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} uds`;
}

export function OrderSummary({ variant, order, productName, workstationName, operatorName, summary, busy, onBack, onPause, onResume }: Props) {
  const s = styles[variant];
  const meta = [workstationName, operatorName].filter(Boolean).join(' · ');
  return (
    <section className={s.card} aria-label="Resumen de la orden">
      <button type="button" onClick={onBack} className={s.back}>
        ← Volver a la cola
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={s.code}>{orderLabel(order)}</p>
          <h2 className={s.title}>{productName ?? 'Orden sin producto'}</h2>
          {meta && <p className={s.meta}>{meta}</p>}
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${summary.stopped ? s.stopped : s.running}`}>
          {summary.stopped ? `En parada${summary.stopReason ? `: ${summary.stopReason}` : ''}` : 'Produciendo'}
        </span>
      </div>

      <div className={s.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.pct}>
        <div className={s.bar} style={{ width: `${summary.pct}%` }} />
      </div>
      <p className={`mt-2 text-lg font-semibold ${s.big}`}>
        {uds(summary.produced)} de {uds(summary.planned)} · {summary.pct} %
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={s.stat}>
          <p className={s.label}>Faltan</p>
          <p className={`text-lg font-semibold ${s.big}`}>{uds(summary.remaining)}</p>
        </div>
        <div className={s.stat}>
          <p className={s.label}>Defectos</p>
          <p className={`text-lg font-semibold ${s.big}`}>
            {uds(summary.defects)} <span className="text-sm font-normal opacity-70">({formatPercent(summary.defectRate)})</span>
          </p>
        </div>
        <div className={s.stat}>
          <p className={s.label}>Paradas</p>
          <p className={`text-lg font-semibold ${s.big}`}>{summary.stopsCount}</p>
        </div>
        <div className={s.stat}>
          <p className={s.label}>Tiempo parado</p>
          <p className={`text-lg font-semibold ${s.big}`}>{formatMinutes(summary.stopMinutes)}</p>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={summary.stopped ? onResume : onPause}
        className={`mt-5 w-full rounded-xl px-6 py-5 text-lg font-bold shadow-sm transition disabled:opacity-50 ${summary.stopped ? s.resume : s.pause}`}
      >
        {summary.stopped ? 'Reanudar producción' : 'Pausar producción'}
      </button>

      <h3 className={s.listTitle}>Últimos bloques</h3>
      {summary.recent.length === 0 ? (
        <p className={s.empty}>Todavía no has registrado ningún bloque en esta orden.</p>
      ) : (
        <ul>
          {summary.recent.map((log) => (
            <li key={log.id} className={s.row}>
              {describeBlock(log)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
