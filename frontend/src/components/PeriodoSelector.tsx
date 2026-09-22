import { useState } from 'react';
import { usePeriodo } from '../store/periodo-store.js';
import { PERIODO_LABELS, PERIODO_MODES, type PeriodoMode } from '../utils/periodo.js';

interface Props { isClassic?: boolean; }

const MODOS_VISIBLES: PeriodoMode[] = ['hoy', 'semana', 'mes', 'mes_anterior', 'todo'];

/**
 * Selector de periodo de los dashboards.
 *
 * Se refleja en la URL además de guardarse, para que el enlace se pueda
 * compartir tal cual: quien lo abre ve el mismo rango, no el suyo guardado.
 */
export function PeriodoSelector({ isClassic }: Props) {
  const { periodo, from, to, setMode, setCustom } = usePeriodo();
  const [customFrom, setCustomFrom] = useState(periodo.from ?? from ?? '');
  const [customTo, setCustomTo] = useState(periodo.to ?? to ?? '');

  const btn = (activo: boolean) =>
    isClassic
      ? `rounded px-3 py-1.5 text-sm font-medium transition ${
          activo ? 'bg-kavana-orange text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`
      : `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          activo ? 'bg-kavana-orange text-white' : 'bg-kavana-surface text-slate-300 ring-1 ring-kavana-steel/30 hover:text-white'
        }`;

  const inputCls = isClassic
    ? 'border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900'
    : 'bg-kavana-dark text-white border border-kavana-steel/30 rounded-lg px-2 py-1 text-sm';

  const rangoTexto = !from && !to ? 'Todo el histórico' : `${from ?? 'el principio'} → ${to ?? 'hoy'}`;

  return (
    <section aria-label="Periodo" className={`mb-6 flex flex-wrap items-center gap-2 rounded-2xl border p-3 ${isClassic ? 'border-gray-200 bg-gray-50' : 'border-kavana-steel/20 bg-kavana-surface/40'}`}>
      <span className={`mr-1 text-xs font-bold uppercase tracking-wider ${isClassic ? 'text-gray-500' : 'text-kavana-steel'}`}>Periodo</span>

      {MODOS_VISIBLES.map((mode) => (
        <button key={mode} type="button" onClick={() => setMode(mode)} className={btn(periodo.mode === mode)}>
          {PERIODO_LABELS[mode]}
        </button>
      ))}

      <div className="flex items-center gap-1">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          aria-label="Desde"
          className={inputCls}
        />
        <span className={isClassic ? 'text-gray-500' : 'text-slate-500'}>→</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          aria-label="Hasta"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => customFrom && customTo && customFrom <= customTo && setCustom(customFrom, customTo)}
          disabled={!customFrom || !customTo || customFrom > customTo}
          className={`${btn(periodo.mode === 'personalizado')} disabled:opacity-40`}
        >
          {PERIODO_LABELS.personalizado}
        </button>
      </div>

      <span className={`ml-auto text-xs ${isClassic ? 'text-gray-500' : 'text-slate-400'}`}>{rangoTexto}</span>
    </section>
  );
}
