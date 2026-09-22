import { create } from 'zustand';
import { calcRange, isPeriodoMode, periodoFromQuery, periodoToQuery, type Periodo, type PeriodoMode } from '../utils/periodo.js';

const STORAGE_KEY = 'kavana_periodo';

/**
 * Periodo activo de los dashboards.
 *
 * Prioridad al arrancar: URL > localStorage > mes actual. La URL manda porque
 * un enlace compartido con un periodo concreto debe abrirse con ese periodo y
 * no con el que tuviera guardado quien lo recibe.
 */
function initialPeriodo(): Periodo {
  const porDefecto: Periodo = { mode: 'mes', from: null, to: null };
  if (typeof window === 'undefined') return porDefecto;

  const fromUrl = periodoFromQuery(window.location.search);
  if (fromUrl) return fromUrl;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return porDefecto;
    const parsed = JSON.parse(stored) as Partial<Periodo>;
    if (!parsed?.mode || !isPeriodoMode(parsed.mode)) return porDefecto;
    if (parsed.mode === 'personalizado' && (!parsed.from || !parsed.to)) return porDefecto;
    return { mode: parsed.mode, from: parsed.from ?? null, to: parsed.to ?? null };
  } catch {
    // Sin localStorage disponible: se usa el periodo por defecto.
    return porDefecto;
  }
}

/** Rango de días efectivo del periodo. 'personalizado' usa las fechas elegidas. */
export function resolveRange(periodo: Periodo): { from: string | null; to: string | null } {
  if (periodo.mode === 'personalizado') return { from: periodo.from, to: periodo.to };
  return calcRange(periodo.mode);
}

function persist(periodo: Periodo): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(periodo));
  } catch {
    // Sin localStorage: el periodo sigue vivo en memoria durante la sesión.
  }
  const query = periodoToQuery(periodo);
  window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
}

interface PeriodoState {
  periodo: Periodo;
  setMode: (mode: PeriodoMode) => void;
  setCustom: (from: string, to: string) => void;
}

export const usePeriodoStore = create<PeriodoState>((set) => ({
  periodo: initialPeriodo(),

  setMode: (mode) =>
    set(() => {
      const periodo: Periodo = { mode, from: null, to: null };
      persist(periodo);
      return { periodo };
    }),

  setCustom: (from, to) =>
    set(() => {
      const periodo: Periodo = { mode: 'personalizado', from, to };
      persist(periodo);
      return { periodo };
    }),
}));

export interface UsePeriodoResult {
  periodo: Periodo;
  /** Días del rango, listos para pasar a la API. */
  from: string | null;
  to: string | null;
  setMode: (mode: PeriodoMode) => void;
  setCustom: (from: string, to: string) => void;
}

export function usePeriodo(): UsePeriodoResult {
  const periodo = usePeriodoStore((s) => s.periodo);
  const setMode = usePeriodoStore((s) => s.setMode);
  const setCustom = usePeriodoStore((s) => s.setCustom);
  const range = resolveRange(periodo);

  return { periodo, from: range.from, to: range.to, setMode, setCustom };
}
