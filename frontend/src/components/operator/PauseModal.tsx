import { useState } from 'react';
import { STOP_REASONS } from '../../utils/stop-reasons.js';

interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function PauseModal({ isOpen, onClose, onConfirm }: PauseModalProps) {
  const [other, setOther] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setOther(false);
    setReason('');
    setError('');
  };

  const confirm = async (text: string) => {
    const clean = text.trim();
    if (clean.length === 0) {
      setError('Escribe el motivo de la parada.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(clean);
      reset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-kavana-steel/40 bg-kavana-dark p-6 shadow-2xl md:p-10">
        <h2 className="mb-2 text-3xl font-black tracking-tight text-white md:text-4xl">Pausar producción</h2>
        <p className="mb-6 text-lg text-slate-300">Toca el motivo de la parada.</p>

        <div className="grid grid-cols-2 gap-3">
          {STOP_REASONS.map((text) => (
            <button
              key={text}
              type="button"
              disabled={isSubmitting}
              onClick={() => void confirm(text)}
              className="min-h-[64px] rounded-2xl bg-kavana-surface px-4 py-4 text-lg font-bold text-white ring-1 ring-kavana-steel/50 transition hover:bg-kavana-orange hover:text-kavana-dark disabled:opacity-50"
            >
              {text}
            </button>
          ))}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setOther(true)}
            className="col-span-2 min-h-[64px] rounded-2xl bg-kavana-surface px-4 py-4 text-lg font-bold text-slate-300 ring-1 ring-kavana-steel/50 transition hover:bg-slate-700 disabled:opacity-50"
          >
            Otro motivo…
          </button>
        </div>

        {other && (
          <div className="mt-4 flex gap-3">
            <input
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirm(reason);
              }}
              className="min-h-touch-target w-full rounded-2xl border border-kavana-steel/30 bg-kavana-surface px-5 py-4 text-xl text-slate-100 outline-none transition focus:border-kavana-orange focus:ring-2 focus:ring-kavana-orange/40"
              placeholder="Escribe el motivo"
              autoFocus
            />
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void confirm(reason)}
              className="rounded-2xl bg-kavana-orange px-6 text-lg font-black uppercase text-kavana-dark shadow-lg transition hover:bg-kavana-orange-light disabled:opacity-50"
            >
              {isSubmitting ? '...' : 'Parar'}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-rose-500/20 p-4 text-rose-300 ring-1 ring-rose-500/30">{error}</p>
        )}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            reset();
            onClose();
          }}
          className="mt-8 w-full rounded-2xl bg-kavana-surface py-4 text-lg font-bold uppercase text-white ring-1 ring-kavana-steel/50 transition hover:bg-slate-700 disabled:opacity-50 min-h-[56px]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
