import { useEffect, useState } from 'react';
import { createCalculator, fetchCalculators, type Calculator } from '../../api/calculators.js';
import { calculatorLabel, clampCount, packingTotals } from '../../utils/calculator.js';
import { formatThousands } from '../../utils/quick-block.js';

type Variant = 'classic' | 'kavana';

interface Props {
  variant: Variant;
  workstationId: string | null;
  /** Suma piezas a la producción buena del bloque. */
  onAdd: (pieces: number) => void;
}

const styles = {
  classic: {
    label: 'text-sm font-medium text-slate-700',
    select: 'min-h-[44px] rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900',
    link: 'min-h-[44px] px-2 text-sm font-semibold text-kavana-orange hover:underline disabled:opacity-40',
    btn: 'min-h-[84px] rounded-lg border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-40',
    main: 'min-h-[84px] rounded-lg border-2 border-kavana-orange bg-orange-50 text-slate-900 hover:bg-orange-100 disabled:opacity-40',
    sub: 'text-sm text-slate-500',
    modal: 'w-full max-w-xl space-y-5 rounded-2xl bg-white p-6 text-slate-900 shadow-2xl',
    input: 'min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 text-lg text-slate-900',
    step: 'w-14 min-h-[60px] rounded-xl border border-slate-300 bg-slate-100 text-2xl font-bold text-slate-700',
    total: 'rounded-xl bg-slate-100 px-5 py-4',
    cancel: 'min-h-[56px] rounded-xl border border-slate-300 px-6 font-semibold text-slate-700',
    save: 'min-h-[56px] flex-1 rounded-xl bg-kavana-orange text-lg font-extrabold text-white disabled:opacity-40',
  },
  kavana: {
    label: 'text-xs font-bold uppercase tracking-wider text-slate-400',
    select: 'min-h-[44px] rounded-xl border border-kavana-steel/30 bg-kavana-surface px-2 text-sm text-white',
    link: 'min-h-[44px] px-2 text-sm font-bold text-kavana-orange hover:underline disabled:opacity-40',
    btn: 'min-h-[84px] rounded-xl border border-kavana-steel/30 bg-kavana-surface text-white hover:bg-kavana-steel/30 disabled:opacity-40',
    main: 'min-h-[84px] rounded-xl border-2 border-kavana-orange bg-kavana-orange/10 text-white hover:bg-kavana-orange/20 disabled:opacity-40',
    sub: 'text-sm text-slate-400',
    modal: 'w-full max-w-xl space-y-5 rounded-2xl border border-kavana-steel/40 bg-kavana-dark p-6 text-white shadow-2xl',
    input: 'min-h-[52px] w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 text-lg text-white',
    step: 'w-14 min-h-[60px] rounded-xl border border-kavana-steel/30 bg-kavana-surface text-2xl font-black text-slate-200',
    total: 'rounded-xl bg-kavana-surface px-5 py-4',
    cancel: 'min-h-[56px] rounded-xl border border-kavana-steel/40 px-6 font-bold text-slate-200',
    save: 'min-h-[56px] flex-1 rounded-xl bg-[#A84A1A] text-lg font-black uppercase text-white disabled:opacity-40',
  },
} as const;

type Style = (typeof styles)[Variant];

function storageKey(workstationId: string): string {
  return `kavana_calculator_${workstationId}`;
}

function readChosen(workstationId: string): string {
  try {
    return localStorage.getItem(storageKey(workstationId)) ?? '';
  } catch {
    return '';
  }
}

/**
 * Calculadoras de embalaje del puesto: +1 palet, +1 fila o +1 paquete suman las
 * piezas de ese embalaje a la producción del bloque, en vez de contar piezas.
 * Las crea el operario y las ve cualquiera que trabaje en ese puesto.
 */
export function CalculatorButtons({ variant, workstationId, onAdd }: Props) {
  const s = styles[variant];
  const [list, setList] = useState<Calculator[]>([]);
  const [chosen, setChosen] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!workstationId) return;
    let alive = true;
    fetchCalculators(workstationId)
      .then((rows) => {
        if (!alive || !Array.isArray(rows)) return;
        setList(rows);
        const saved = readChosen(workstationId);
        setChosen(rows.some((c) => c.id === saved) ? saved : (rows[0]?.id ?? ''));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [workstationId]);

  if (!workstationId) return null;

  const choose = (id: string) => {
    setChosen(id);
    try {
      localStorage.setItem(storageKey(workstationId), id);
    } catch {
      // sin almacenamiento local: la elección vale solo para esta pantalla
    }
  };

  const calc = list.find((c) => c.id === chosen) ?? null;
  const totals = calc ? packingTotals(calc.pieces_per_pack, calc.packs_per_row, calc.rows_per_pallet) : null;
  const button = (title: string, pieces: number | undefined, main = false) => (
    <button
      type="button"
      disabled={!calc || pieces === undefined}
      onClick={() => pieces !== undefined && onAdd(pieces)}
      className={`flex flex-col items-center justify-center gap-0.5 ${main ? s.main : s.btn}`}
    >
      <span className="text-xl font-extrabold">{title}</span>
      <span className={s.sub}>{pieces !== undefined ? `${formatThousands(pieces)} piezas` : '—'}</span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className={`flex items-center gap-2 ${s.label}`}>
          Calculadora
          <select value={chosen} onChange={(e) => choose(e.target.value)} className={s.select}>
            {list.length === 0 && <option value="">Sin calculadoras en este puesto</option>}
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {calculatorLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setCreating(true)} className={s.link}>
          Nueva calculadora
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {button('+1 palet', totals?.perPallet, true)}
        {button('+1 fila', totals?.perRow)}
        {button('+1 paquete', totals?.perPack)}
      </div>
      {creating && (
        <NewCalculator
          variant={variant}
          workstationId={workstationId}
          onCancel={() => setCreating(false)}
          onSaved={(c) => {
            setList((l) => [...l, c]);
            choose(c.id);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function Counter({ id, label, value, onChange, s }: { id: string; label: string; value: number; onChange: (v: number) => void; s: Style }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`text-sm font-semibold ${s.label}`}>
        {label}
      </label>
      <div className="flex gap-2">
        <button type="button" aria-label={`Menos ${label.toLowerCase()}`} className={s.step} onClick={() => onChange(clampCount(value - 1))}>
          −
        </button>
        <input
          id={id}
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(clampCount(Number(e.target.value)))}
          className={`${s.input} min-w-0 text-center text-2xl font-extrabold`}
        />
        <button type="button" aria-label={`Más ${label.toLowerCase()}`} className={s.step} onClick={() => onChange(clampCount(value + 1))}>
          +
        </button>
      </div>
    </div>
  );
}

function NewCalculator({
  variant,
  workstationId,
  onCancel,
  onSaved,
}: {
  variant: Variant;
  workstationId: string;
  onCancel: () => void;
  onSaved: (c: Calculator) => void;
}) {
  const s = styles[variant];
  const [name, setName] = useState('');
  const [pp, setPp] = useState(5);
  const [pf, setPf] = useState(2);
  const [fp, setFp] = useState(4);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const t = packingTotals(pp, pf, fp);

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      onSaved(
        await createCalculator({ workstation_id: workstationId, name: name.trim(), pieces_per_pack: pp, packs_per_row: pf, rows_per_pallet: fp }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-label="Nueva calculadora" className={s.modal}>
        <h2 className="text-2xl font-extrabold">Nueva calculadora</h2>
        <label className="flex flex-col gap-1.5">
          <span className={`text-sm font-semibold ${s.label}`}>Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Palet estándar K-100" className={s.input} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Counter id="calc-pp" label="Piezas por paquete" value={pp} onChange={setPp} s={s} />
          <Counter id="calc-pf" label="Paquetes por fila" value={pf} onChange={setPf} s={s} />
          <Counter id="calc-fp" label="Filas por palet" value={fp} onChange={setFp} s={s} />
        </div>
        <div className={s.total}>
          <p className={s.sub}>Un palet son</p>
          <p className="text-4xl font-extrabold">
            {formatThousands(t.perPallet)} <span className={`text-xl font-semibold ${s.sub}`}>piezas</span>
          </p>
          <p className={s.sub}>
            {pp} × {pf} × {fp} · una fila = {formatThousands(t.perRow)} · un paquete = {formatThousands(t.perPack)}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-rose-500">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className={s.cancel}>
            Cancelar
          </button>
          <button type="button" onClick={() => void save()} disabled={!name.trim() || saving} className={s.save}>
            {saving ? 'Guardando...' : 'Guardar y usar'}
          </button>
        </div>
      </div>
    </div>
  );
}
