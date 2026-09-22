import { useHmiStore } from '../../store/hmi-store.js';
import { offlineBannerState } from '../../utils/offline-banner.js';

/**
 * Aviso de desconexión para toda la aplicación.
 *
 * Se monta una sola vez en App, así que cubre los tres paneles de rol, los
 * clásicos, el admin global y las pantallas de login sin repetirlo en cada uno.
 * El estado de conexión lo mantiene el store escuchando los eventos online y
 * offline del navegador.
 */
export function OfflineBanner() {
  const isOnline = useHmiStore((s) => s.isOnline);
  const pendingCount = useHmiStore((s) => s.pendingCount);

  const state = offlineBannerState({ isOnline, pendingCount });
  if (!state) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[70] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-center text-xs font-bold text-amber-950 shadow-lg sm:text-sm"
    >
      <span aria-hidden="true">📶</span>
      <span>{state.text}</span>
      <span className="rounded-full bg-amber-950/15 px-2 py-0.5 text-[11px] font-semibold">{state.detail}</span>
    </div>
  );
}
