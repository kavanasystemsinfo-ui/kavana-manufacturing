import { useState } from 'react';

interface FinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (producedQuantity: number, defectQuantity: number) => Promise<void>;
}

export function FinishModal({ isOpen, onClose, onConfirm }: FinishModalProps) {
  const [produced, setProduced] = useState<number>(0);
  const [defect, setDefect] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(produced, defect);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustProduced = (amount: number) => {
    setProduced((prev) => Math.max(0, prev + amount));
  };

  const adjustDefect = (amount: number) => {
    setDefect((prev) => Math.max(0, prev + amount));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-kavana-steel/40 bg-kavana-dark p-6 shadow-2xl md:p-10">
        <h2 className="mb-8 text-3xl font-black tracking-tight text-white md:text-5xl">Terminar Orden</h2>
        
        <div className="space-y-8">
          <QuantityAdjuster 
            label="Piezas Producidas" 
            value={produced} 
            onChange={adjustProduced} 
            colorTone="emerald" 
          />
          <QuantityAdjuster 
            label="Mermas / Chatarra" 
            value={defect} 
            onChange={adjustDefect} 
            colorTone="rose" 
          />
        </div>

        <div className="mt-12 flex gap-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
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

function QuantityAdjuster({ 
  label, 
  value, 
  onChange, 
  colorTone 
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void;
  colorTone: 'emerald' | 'rose';
}) {
  const labelColor = colorTone === 'emerald' ? 'text-emerald-400' : 'text-rose-400';
  const valColor = colorTone === 'emerald' ? 'text-emerald-100' : 'text-rose-100';

  return (
    <div className="rounded-2xl border border-kavana-steel/30 bg-kavana-surface p-6">
      <p className={`text-sm font-bold uppercase tracking-[0.2em] ${labelColor}`}>{label}</p>
      
      <div className="mt-6 flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="flex gap-2">
          <AdjustButton onClick={() => onChange(-100)}>-100</AdjustButton>
          <AdjustButton onClick={() => onChange(-10)}>-10</AdjustButton>
          <AdjustButton onClick={() => onChange(-1)}>-1</AdjustButton>
        </div>

        <div className={`text-5xl font-black tracking-tighter md:text-6xl ${valColor}`}>
          {value}
        </div>

        <div className="flex gap-2">
          <AdjustButton onClick={() => onChange(1)}>+1</AdjustButton>
          <AdjustButton onClick={() => onChange(10)}>+10</AdjustButton>
          <AdjustButton onClick={() => onChange(100)}>+100</AdjustButton>
        </div>
      </div>
    </div>
  );
}

function AdjustButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[64px] min-w-[64px] rounded-xl bg-slate-800 text-xl font-bold text-slate-200 transition active:scale-95 active:bg-slate-700 md:text-2xl hover:bg-slate-700 ring-1 ring-white/10"
    >
      {children}
    </button>
  );
}
