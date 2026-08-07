import { useState } from 'react';
import { AiAdvisorChat, type AdvisorMode } from './AiAdvisorChat.js';
import { useThemeStore } from '../store/theme-store.js';

// Botón flotante "🤖 Asistente" que abre el chat IA en un modal con selector
// de modo: MES (datos de producción) o Técnico (código/arquitectura).
// Montado en los 3 paneles de rol (admin, supervisor, operario) y en el login.
export function AiAdvisorFab() {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AdvisorMode>('mes');

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Asistente técnico IA"
        title="Asistente técnico IA"
        className={`fixed bottom-5 right-5 z-50 flex min-h-[56px] min-w-[56px] items-center justify-center rounded-full text-2xl shadow-2xl transition active:scale-95 ${
          isClassic
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-kavana-orange text-white hover:bg-kavana-orange-light shadow-orange-900/40'
        }`}
      >
        🤖
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl">
            <button
              onClick={() => setOpen(false)}
              className={`absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-lg transition active:scale-95 ${
                isClassic
                  ? 'bg-slate-800 text-white hover:bg-slate-900'
                  : 'bg-kavana-surface text-slate-300 hover:text-white ring-1 ring-kavana-steel/40'
              }`}
              aria-label="Cerrar asistente"
            >
              ✕
            </button>
            <div className={`mb-2 flex gap-1 rounded-xl p-1 ${isClassic ? 'bg-slate-200' : 'bg-kavana-dark/80 ring-1 ring-kavana-steel/30'}`}>
              <button
                onClick={() => setMode('mes')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  mode === 'mes'
                    ? (isClassic ? 'bg-blue-600 text-white' : 'bg-kavana-orange text-white shadow')
                    : (isClassic ? 'text-slate-600 hover:bg-slate-300' : 'text-slate-400 hover:text-white')
                }`}
              >
                🏭 Datos de producción
              </button>
              <button
                onClick={() => setMode('tech')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  mode === 'tech'
                    ? (isClassic ? 'bg-blue-600 text-white' : 'bg-kavana-orange text-white shadow')
                    : (isClassic ? 'text-slate-600 hover:bg-slate-300' : 'text-slate-400 hover:text-white')
                }`}
              >
                📐 Código y arquitectura
              </button>
            </div>
            <AiAdvisorChat mode={mode} />
          </div>
        </div>
      )}
    </>
  );
}
