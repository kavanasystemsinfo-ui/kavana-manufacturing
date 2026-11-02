import { useState } from 'react';
import {
  NEXT_LIMIT,
  buildOrderQueue,
  formatQuantity,
  orderLabel,
  orderProgress,
  type QueueOrder,
} from '../../utils/order-queue.js';

type Variant = 'classic' | 'kavana';

interface Props<T extends QueueOrder> {
  orders: T[];
  /** Con una búsqueda activa se enseñan todos los resultados, sin plegar. */
  searching: boolean;
  variant: Variant;
  onSelect: (order: T) => void;
}

const styles = {
  classic: {
    heading: 'mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-slate-500',
    card: 'w-full rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-kavana-orange hover:shadow-md',
    active: 'border-kavana-orange/60 bg-orange-50',
    title: 'font-medium text-slate-900',
    meta: 'mt-1 text-sm text-slate-500',
    code: 'text-xs font-semibold text-slate-400',
    track: 'mt-3 h-2 overflow-hidden rounded-full bg-slate-200',
    bar: 'h-full rounded-full bg-kavana-orange',
    pct: 'text-xs font-semibold text-slate-600',
    badgeRunning: 'bg-orange-100 text-orange-700',
    badgePending: 'bg-amber-100 text-amber-700',
    more: 'mt-4 w-full rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-kavana-orange hover:text-kavana-orange',
  },
  kavana: {
    heading: 'mb-2 mt-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400',
    card: 'w-full rounded-xl border border-kavana-steel/20 bg-kavana-surface/60 p-5 text-left transition hover:border-kavana-orange/40 hover:bg-kavana-surface hover:shadow-lg',
    active: 'border-kavana-orange/50 bg-kavana-surface',
    title: 'text-lg font-bold text-white',
    meta: 'mt-1 text-sm text-slate-400',
    code: 'text-xs font-semibold text-slate-500',
    track: 'mt-3 h-2 overflow-hidden rounded-full bg-kavana-dark',
    bar: 'h-full rounded-full bg-kavana-orange',
    pct: 'text-xs font-semibold text-slate-300',
    badgeRunning: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40',
    badgePending: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
    more: 'mt-4 w-full rounded-xl border border-dashed border-kavana-steel/40 py-3 text-sm font-medium text-slate-300 hover:border-kavana-orange/60 hover:text-white',
  },
} as const;

export function OrderQueue<T extends QueueOrder>({ orders, searching, variant, onSelect }: Props<T>) {
  const s = styles[variant];
  const [showBacklog, setShowBacklog] = useState(false);
  const queue = buildOrderQueue(orders, searching ? orders.length : NEXT_LIMIT);

  const card = (order: T) => {
    const running = order.status === 'in_progress';
    const pct = orderProgress(order);
    return (
      <button
        key={order.id}
        onClick={() => onSelect(order)}
        className={`${s.card} ${running ? s.active : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={s.code}>{orderLabel(order)}</p>
            <p className={s.title}>{order.model_name ?? 'Sin modelo'}</p>
            <p className={s.meta}>
              {order.workstation_name ?? 'Sin puesto'} · Previsto: {formatQuantity(order.quantity)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${running ? s.badgeRunning : s.badgePending}`}>
            {running ? 'En curso' : 'Pendiente'}
          </span>
        </div>
        {running && (
          <div>
            <div className={s.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className={s.bar} style={{ width: `${pct}%` }} />
            </div>
            <p className={`${s.pct} mt-1`}>
              {formatQuantity(order.produced_quantity)} hechas · {pct} %
            </p>
          </div>
        )}
      </button>
    );
  };

  return (
    <div>
      {queue.inProgress.length > 0 && (
        <section>
          <h2 className={s.heading.replace('mt-6', 'mt-0')}>En curso</h2>
          <div className="space-y-3">{queue.inProgress.map(card)}</div>
        </section>
      )}
      {queue.next.length > 0 && (
        <section>
          <h2 className={s.heading}>{searching ? 'Resultados' : 'Siguientes'}</h2>
          <div className="space-y-3">{queue.next.map(card)}</div>
        </section>
      )}
      {queue.backlog.length > 0 && (
        <section>
          <button type="button" className={s.more} onClick={() => setShowBacklog((v) => !v)}>
            {showBacklog ? 'Ocultar el resto' : `Ver el resto (${queue.backlog.length} más)`}
          </button>
          {showBacklog && <div className="mt-3 space-y-3">{queue.backlog.map(card)}</div>}
        </section>
      )}
    </div>
  );
}
