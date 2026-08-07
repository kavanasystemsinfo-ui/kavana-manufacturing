import { useState } from 'react';
import { AiAdvisorChat } from './AiAdvisorChat.js';
import { useThemeStore } from '../store/theme-store.js';

// Botón flotante "🤖 Asistente" que abre el chat IA en un modal.
// Montado en los 3 paneles de rol (admin, supervisor, operario) y en el login.
export function AiAdvisorFab() {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';
  const [open, setOpen] = useState(false);

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
            <AiAdvisorChat />
          </div>
        </div>
      )}
    </>
  );
}
