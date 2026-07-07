import { useEffect, useState } from 'react';
import { localDb, type FailedOfflineWorkBlock } from '../../db/local-db.js';

interface FailedEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAll: () => void;
}

export function FailedEventsModal({ isOpen, onClose, onClearAll }: FailedEventsModalProps) {
  const [failedBlocks, setFailedBlocks] = useState<FailedOfflineWorkBlock[]>([]);

  useEffect(() => {
    if (isOpen) {
      localDb.failedBlocks.toArray().then(setFailedBlocks);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearAll = async () => {
    await localDb.failedBlocks.clear();
    setFailedBlocks([]);
    onClearAll();
    onClose();
  };

  const handleDeleteOne = async (id: string) => {
    await localDb.failedBlocks.delete(id);
    setFailedBlocks((prev) => prev.filter((block) => block.id !== id));
    onClearAll();
  };

  const typeLabel: Record<string, string> = {
    produccion: '▶ Producción',
    parada: '⏸ Parada',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border border-kavana-steel/40 bg-kavana-dark shadow-2xl">
        <div className="flex items-center justify-between border-b border-kavana-steel/30 p-6 md:p-8">
          <h2 className="text-2xl font-black tracking-tight text-white md:text-4xl">
            Eventos Fallidos
          </h2>
          <span className="rounded-full bg-rose-500/20 px-4 py-2 text-sm font-bold text-rose-300 ring-1 ring-rose-500/30">
            {failedBlocks.length} {failedBlocks.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {failedBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-6xl">✅</p>
              <p className="mt-4 text-xl font-bold text-slate-300">Sin fallos pendientes</p>
              <p className="mt-2 text-sm text-slate-400">Todos los eventos se han sincronizado correctamente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {failedBlocks.map((block) => (
                <div
                  key={block.id}
                  className="rounded-2xl border border-rose-500/20 bg-kavana-surface p-5 transition hover:border-rose-500/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-lg bg-kavana-dark px-3 py-1 text-sm font-bold text-slate-200">
                          {typeLabel[block.type] ?? block.type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(block.start_time).toLocaleString('es-ES')} — {new Date(block.end_time).toLocaleTimeString('es-ES')}
                        </span>
                      </div>
                      <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-3 font-mono text-sm text-rose-300 break-all">
                        ❌ {block.error || 'Error desconocido'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
                        <span>Orden: <code className="text-slate-300">{block.order_id.slice(0, 8)}...</code></span>
                        <span>Estación: <code className="text-slate-300">{block.workstation_id.slice(0, 8)}...</code></span>
                        <span>Operario: <code className="text-slate-300">{block.operator_id.slice(0, 8)}...</code></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteOne(block.id)}
                      className="shrink-0 rounded-xl bg-kavana-dark px-3 py-2 text-sm font-bold text-slate-400 ring-1 ring-kavana-steel/30 transition hover:bg-rose-500/20 hover:text-rose-300"
                      title="Eliminar este evento"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4 border-t border-kavana-steel/30 p-6 md:p-8">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-kavana-surface py-5 text-xl font-bold uppercase text-white ring-1 ring-kavana-steel/50 transition hover:bg-slate-700 min-h-[64px]"
          >
            Cerrar
          </button>
          {failedBlocks.length > 0 && (
            <button
              type="button"
              onClick={() => void handleClearAll()}
              className="flex-1 rounded-2xl bg-rose-600 py-5 text-xl font-black uppercase text-white shadow-lg transition hover:bg-rose-500 min-h-[64px]"
            >
              Limpiar Todos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
