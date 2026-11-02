import { useState } from 'react';
import { useMyShiftKPI } from '../../hooks/useMyShiftKPI.js';
import { formatMinutes } from '../../utils/order-summary.js';
import { formatThousands } from '../../utils/quick-block.js';
import { shiftReportText, summarizeShift } from '../../utils/shift-summary.js';

type Variant = 'classic' | 'kavana';

interface Props {
  variant: Variant;
  operatorName: string | null;
  workstationName: string | null;
  dateLabel: string;
  /** Etiqueta legible de una orden («Orden 4465»), a partir de su id. */
  labelOf: (orderId: string) => string;
  onBack: () => void;
}

const styles = {
  classic: {
    page: 'mx-auto w-[90%] px-4 py-6 sm:px-6 lg:px-8',
    card: 'mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm',
    back: 'text-sm font-medium text-slate-500 hover:text-kavana-orange',
    title: 'mt-2 text-2xl font-bold text-slate-900',
    meta: 'mt-1 text-sm text-slate-500',
    h3: 'text-xs font-bold uppercase tracking-wider text-slate-500',
    stat: 'rounded-lg border border-slate-200 bg-slate-50 p-3',
    label: 'text-xs font-medium text-slate-500',
    big: 'text-slate-900',
    row: 'flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm text-slate-700 last:border-0',
    muted: 'text-sm text-slate-400',
    copy: 'rounded-lg bg-kavana-orange px-6 py-4 text-base font-semibold text-white hover:bg-kavana-orange-light',
    secondary: 'rounded-lg border border-slate-300 px-6 py-4 text-base font-semibold text-slate-700 hover:bg-slate-100',
  },
  kavana: {
    page: 'mx-auto w-full max-w-5xl px-4 py-6',
    card: 'mb-4 rounded-2xl border-2 border-kavana-orange/40 bg-kavana-dark/70 p-5 shadow-inner',
    back: 'text-sm font-bold text-slate-400 hover:text-kavana-orange',
    title: 'mt-2 text-3xl font-black text-white',
    meta: 'mt-2 text-slate-300',
    h3: 'text-xs font-bold uppercase tracking-[0.2em] text-slate-400',
    stat: 'rounded-xl border border-kavana-steel/20 bg-kavana-surface/60 p-3',
    label: 'text-xs font-bold uppercase tracking-wider text-slate-400',
    big: 'text-white',
    row: 'flex items-center justify-between gap-3 border-b border-kavana-steel/20 py-2 text-sm text-slate-300 last:border-0',
    muted: 'text-sm text-slate-500',
    copy: 'rounded-xl bg-[#A84A1A] px-6 py-4 text-base font-black uppercase tracking-wider text-white hover:bg-[#BC5B2F]',
    secondary: 'rounded-xl border border-kavana-steel/40 px-6 py-4 text-base font-bold text-slate-200 hover:bg-kavana-steel/20',
  },
} as const;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Cierre de turno: lo que has hecho hoy por orden y por motivo de parada, con un
 * botón para copiarlo y dejárselo escrito al compañero del turno siguiente.
 */
export function ShiftClose({ variant, operatorName, workstationName, dateLabel, labelOf, onBack }: Props) {
  const s = styles[variant];
  const { blocks, isLoading, error, refresh } = useMyShiftKPI();
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const summary = summarizeShift(blocks, labelOf);
  const stopsCount = summary.stops.reduce((n, r) => n + r.count, 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shiftReportText(summary, { date: dateLabel, operator: operatorName, workstation: workstationName }));
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };

  return (
    <div className={s.page}>
      <section className={s.card} aria-label="Cierre de turno">
        <button type="button" onClick={onBack} className={s.back}>
          ← Volver
        </button>
        <h2 className={s.title}>Cierre de turno</h2>
        <p className={s.meta}>{[dateLabel, operatorName, workstationName].filter(Boolean).join(' · ')}</p>

        {isLoading ? (
          <p className={`mt-4 ${s.muted}`}>Cargando tu turno de hoy...</p>
        ) : error ? (
          <div className="mt-4">
            <p className="text-sm text-rose-500">{error}</p>
            <button type="button" onClick={() => void refresh()} className={`mt-3 ${s.secondary}`}>
              Reintentar
            </button>
          </div>
        ) : blocks.length === 0 ? (
          <p className={`mt-4 ${s.muted}`}>Hoy no has registrado ningún bloque todavía.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={s.stat}>
                <p className={s.label}>Piezas buenas</p>
                <p className={`text-xl font-semibold ${s.big}`}>{formatThousands(summary.kpi.buenas)}</p>
              </div>
              <div className={s.stat}>
                <p className={s.label}>Defectos</p>
                <p className={`text-xl font-semibold ${s.big}`}>{formatThousands(summary.kpi.defectos)}</p>
              </div>
              <div className={s.stat}>
                <p className={s.label}>Paradas</p>
                <p className={`text-xl font-semibold ${s.big}`}>{stopsCount}</p>
              </div>
              <div className={s.stat}>
                <p className={s.label}>Tiempo parado</p>
                <p className={`text-xl font-semibold ${s.big}`}>{formatMinutes(summary.stopMinutes)}</p>
              </div>
            </div>

            <h3 className={`mt-6 ${s.h3}`}>Por orden</h3>
            <ul>
              {summary.orders.map((o) => (
                <li key={o.orderId} className={s.row}>
                  <span className="font-semibold">{o.label}</span>
                  <span>
                    {formatThousands(o.good)} buenas · {formatThousands(o.defects)} defectos
                    {o.stops > 0 ? ` · ${plural(o.stops, 'parada', 'paradas')} (${formatMinutes(o.stopMinutes)})` : ''}
                  </span>
                </li>
              ))}
            </ul>

            {summary.stops.length > 0 && (
              <>
                <h3 className={`mt-6 ${s.h3}`}>Paradas por motivo</h3>
                <ul>
                  {summary.stops.map((r) => (
                    <li key={r.reason} className={s.row}>
                      <span>{r.reason}</span>
                      <span>
                        {plural(r.count, 'vez', 'veces')} · {formatMinutes(r.minutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void copy()} className={s.copy}>
                Copiar resumen para el relevo
              </button>
              {copied === 'ok' && <span className={s.muted}>Copiado. Ya puedes pegarlo donde lo necesites.</span>}
              {copied === 'fail' && <span className="text-sm text-rose-500">No se pudo copiar. Revisa los permisos del navegador.</span>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
