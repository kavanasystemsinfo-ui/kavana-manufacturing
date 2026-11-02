import { useEffect, useState } from 'react';
import { formatThousands, stepQuantity, toHHMM } from '../../utils/quick-block.js';
import { CalculatorButtons } from './CalculatorButtons.js';

type Variant = 'classic' | 'kavana';

interface Props {
  variant: Variant;
  startTime: string;
  endTime: string;
  producedQuantity: string;
  defectQuantity: string;
  observations: string;
  /** Final del último bloque de hoy: se pone solo como hora de inicio si está vacía. */
  suggestedStart: string | null;
  /** Puesto del operario; con él se cargan sus calculadoras de embalaje. */
  workstationId: string | null;
  busy: boolean;
  onStartTime: (v: string) => void;
  onEndTime: (v: string) => void;
  onProduced: (v: string) => void;
  onDefects: (v: string) => void;
  onObservations: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRepeat?: (() => void) | null;
}

const styles = {
  classic: {
    card: 'rounded-lg border border-slate-200 bg-white shadow-sm',
    head: 'border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3',
    title: 'text-sm font-semibold text-slate-900',
    label: 'block text-sm font-medium text-slate-700',
    input: 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-base shadow-sm focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange',
    qty: 'w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-center text-2xl font-bold text-slate-900 focus:border-kavana-orange focus:outline-none',
    step: 'rounded-md border border-slate-300 bg-slate-100 text-xl font-bold text-slate-700 hover:bg-slate-200',
    chip: 'rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100',
    link: 'text-sm font-medium text-kavana-orange hover:underline',
    submit: 'w-full rounded-md bg-kavana-orange px-6 py-5 text-lg font-semibold text-white shadow-sm hover:bg-kavana-orange-light disabled:opacity-50',
    repeat: 'rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100',
    textarea: 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange resize-none',
  },
  kavana: {
    card: 'rounded-2xl border-2 border-kavana-orange/40 bg-kavana-dark/70 p-5 shadow-inner',
    head: 'mb-4 flex items-center justify-between gap-3',
    title: 'text-sm font-bold uppercase tracking-[0.24em] text-slate-400',
    label: 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1',
    input: 'w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-base font-medium text-white focus:border-kavana-orange focus:outline-none',
    qty: 'w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-3 py-3 text-center text-3xl font-black text-white focus:border-kavana-orange focus:outline-none',
    step: 'rounded-xl border border-kavana-steel/30 bg-kavana-surface text-2xl font-black text-slate-200 hover:bg-kavana-steel/30',
    chip: 'rounded-full border border-kavana-steel/40 bg-kavana-surface px-3 py-2 text-sm font-bold text-slate-200 hover:bg-kavana-steel/30',
    link: 'text-sm font-bold text-kavana-orange hover:underline',
    submit: 'w-full rounded-xl bg-[#A84A1A] px-6 py-5 text-lg font-black uppercase tracking-wider text-white transition hover:bg-[#BC5B2F] disabled:opacity-50',
    repeat: 'rounded-lg border border-kavana-orange/50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-kavana-orange transition hover:bg-kavana-orange/10',
    textarea: 'w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:border-kavana-orange focus:outline-none resize-none',
  },
} as const;

const PRODUCED_CHIPS = [10, 100, 1000];

interface StepperProps {
  label: string;
  value: string;
  step: number;
  chips: number[];
  onChange: (v: string) => void;
  s: (typeof styles)[Variant];
}

function Stepper({ label, value, step, chips, onChange, s }: StepperProps) {
  return (
    <div>
      <label className={s.label}>{label}</label>
      <div className="mt-1 grid grid-cols-[3.5rem_1fr_3.5rem] gap-2">
        <button type="button" aria-label={`Quitar ${step} a ${label}`} className={s.step} onClick={() => onChange(stepQuantity(value, -step))}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          className={s.qty}
        />
        <button type="button" aria-label={`Sumar ${step} a ${label}`} className={s.step} onClick={() => onChange(stepQuantity(value, step))}>
          +
        </button>
      </div>
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c} type="button" className={s.chip} onClick={() => onChange(stepQuantity(value, c))}>
              +{formatThousands(c)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Registro de un bloque de producción en pocos toques: la hora de inicio llega
 * rellena, el fin es «ahora» y las cantidades se mueven con botones grandes.
 */
export function QuickBlockForm(props: Props) {
  const s = styles[props.variant];
  const { startTime, suggestedStart, onStartTime } = props;
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (!startTime && suggestedStart) onStartTime(suggestedStart);
  }, [startTime, suggestedStart, onStartTime]);

  return (
    <div className={s.card}>
      <div className={s.head}>
        <h2 className={s.title}>Registrar bloque de producción</h2>
        {props.onRepeat && (
          <button
            type="button"
            onClick={props.onRepeat}
            title="Rellena el formulario con el último bloque declarado y pone la hora de fin a ahora"
            className={s.repeat}
          >
            Repetir último bloque
          </button>
        )}
      </div>
      <form onSubmit={props.onSubmit} className={props.variant === 'classic' ? 'flex flex-col gap-5 p-4' : 'flex flex-col gap-5'}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={s.label}>Desde</label>
            <input
              type="time"
              value={props.startTime}
              onChange={(e) => props.onStartTime(e.target.value)}
              required
              className={s.input}
            />
          </div>
          <div>
            <label className={s.label}>Hasta</label>
            <input
              type="time"
              value={props.endTime}
              onChange={(e) => props.onEndTime(e.target.value)}
              className={s.input}
            />
            <button type="button" className={`mt-2 ${s.link}`} onClick={() => props.onEndTime(toHHMM(new Date()))}>
              {props.endTime ? 'Poner la hora actual' : 'Vacío = ahora'}
            </button>
          </div>
        </div>

        <CalculatorButtons
          variant={props.variant}
          workstationId={props.workstationId}
          onAdd={(pieces) => props.onProduced(stepQuantity(props.producedQuantity, pieces))}
        />

        <Stepper label="Producción buena" value={props.producedQuantity} step={1} chips={PRODUCED_CHIPS} onChange={props.onProduced} s={s} />
        <Stepper label="Defectos" value={props.defectQuantity} step={1} chips={[]} onChange={props.onDefects} s={s} />

        {showNotes ? (
          <div>
            <label className={s.label}>Observaciones (opcional)</label>
            <textarea
              value={props.observations}
              onChange={(e) => props.onObservations(e.target.value)}
              rows={3}
              className={s.textarea}
            />
          </div>
        ) : (
          <button type="button" className={`self-start ${s.link}`} onClick={() => setShowNotes(true)}>
            + Añadir observación
          </button>
        )}

        <button type="submit" disabled={props.busy} className={s.submit}>
          {props.busy ? 'Guardando...' : 'Registrar producción'}
        </button>
      </form>
    </div>
  );
}
