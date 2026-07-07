import { useState } from 'react';

interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function PauseModal({ isOpen, onClose, onConfirm }: PauseModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (reason.trim().length === 0) {
      setError('Debes introducir un motivo de parada.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-kavana-steel/40 bg-kavana-dark p-6 shadow-2xl md:p-10">
        <h2 className="mb-4 text-3xl font-black tracking-tight text-white md:text-5xl">Pausar Orden</h2>
        <p className="mb-8 text-lg text-slate-300">
          ¿Por qué se detiene la producción?
        </p>
        
        <div className="space-y-6">
          <label className="block">
            <span className="mb-3 block text-sm font-bold uppercase tracking-[0.2em] text-kavana-steel">
              Motivo de parada
            </span>
            <input
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              className="min-h-touch-target w-full rounded-2xl border border-kavana-steel/30 bg-kavana-surface px-6 py-5 text-2xl text-slate-100 outline-none transition focus:border-kavana-orange focus:ring-2 focus:ring-kavana-orange/40"
              placeholder="Ej.: Faltan piezas, Mantenimiento..."
              autoFocus
            />
          </label>
          {error && (
            <p className="rounded-xl bg-rose-500/20 p-4 text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}
        </div>

        <div className="mt-12 flex gap-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setReason('');
              setError('');
              onClose();
            }}
            className="flex-1 rounded-2xl bg-kavana-surface py-5 text-xl font-bold uppercase text-white ring-1 ring-kavana-steel/50 transition hover:bg-slate-700 disabled:opacity-50 min-h-[64px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleConfirm()}
            className="flex-1 rounded-2xl bg-kavana-orange py-5 text-xl font-black uppercase text-kavana-dark shadow-lg transition hover:bg-kavana-orange-light disabled:opacity-50 min-h-[64px]"
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar Parada'}
          </button>
        </div>
      </div>
    </div>
  );
}
