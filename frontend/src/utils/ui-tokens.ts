/**
 * Clases de aviso compartidas (design tokens en código).
 *
 * La aplicación tiene dos temas y cada color existe dos veces: el clásico, claro,
 * y el moderno, oscuro. Ese par estaba copiado a mano en cada pantalla, así que
 * un retoque había que repetirlo en seis sitios y siempre se quedaba alguno atrás.
 *
 * Aquí vive el par, en un solo sitio. Los colores de marca están en
 * `tailwind.config.js` (`kavana-*`) y el porqué de cada uno, en
 * `docs/design-tokens.md`.
 */
export type AlertVariant = 'error' | 'warning' | 'success';

export const ALERT_VARIANTS: Record<AlertVariant, { classic: string; modern: string }> = {
  error: {
    classic: 'bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm',
    modern: 'bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm',
  },
  warning: {
    classic: 'bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-800 text-sm',
    modern: 'bg-amber-900/40 border border-amber-700 rounded-lg p-3 text-amber-200 text-sm',
  },
  success: {
    classic: 'bg-emerald-50 border border-emerald-200 rounded px-3 py-2 text-emerald-800 text-sm',
    modern: 'bg-emerald-900/40 border border-emerald-700 rounded-lg p-3 text-emerald-200 text-sm',
  },
};

/** Clase del aviso para el tema en uso. `isClassic` es opcional porque los paneles
 * lo reciben como prop opcional: sin valor, el tema es el moderno. */
export function alertClass(variant: AlertVariant, isClassic?: boolean): string {
  return isClassic ? ALERT_VARIANTS[variant].classic : ALERT_VARIANTS[variant].modern;
}

/**
 * Piezas del panel con su par de temas. El supervisor tiene DOS pantallas (la
 * clásica y la de Kavana) con la misma función: si cada una se pinta a mano, se
 * desfasan (fue justo lo que pasó con los filtros y con los colores de estado).
 */
export interface ThemeClassPair {
  classic: string;
  modern: string;
}

export function themed(pair: ThemeClassPair, isClassic?: boolean): string {
  return isClassic ? pair.classic : pair.modern;
}

export const SURFACE: ThemeClassPair = {
  classic: 'rounded-lg border border-slate-200 bg-white shadow-sm',
  modern: 'rounded-2xl border border-kavana-steel/25 bg-kavana-surface',
};

export const INPUT: ThemeClassPair = {
  classic:
    'w-full min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-kavana-orange focus:outline-none focus:ring-1 focus:ring-kavana-orange',
  modern:
    'w-full min-h-[44px] rounded-lg border-2 border-kavana-steel/30 bg-kavana-dark px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-kavana-orange focus:outline-none',
};

export const BUTTON_PRIMARY: ThemeClassPair = {
  classic:
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-kavana-orange px-4 py-2 text-sm font-medium text-white transition hover:bg-kavana-orange-light active:scale-95',
  modern:
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-kavana-orange px-4 py-2 text-sm font-bold text-white transition hover:bg-kavana-orange-light active:scale-95',
};

export const BUTTON_SECONDARY: ThemeClassPair = {
  classic:
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50',
  modern:
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-kavana-steel/20 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-kavana-steel/40',
};

export const BUTTON_DANGER: ThemeClassPair = {
  classic:
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100',
  modern:
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20',
};

export const NOTICE_INFO: ThemeClassPair = {
  classic: 'rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900',
  modern: 'rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200',
};

/**
 * Colores de estado de una orden, iguales en las dos pantallas y en las dos
 * vistas (tablero y lista). Un estado desconocido cae a neutro, nunca a un color
 * que signifique otra cosa.
 */
export const ORDER_STATUS_BADGE: Record<string, ThemeClassPair> = {
  pending: {
    classic: 'bg-amber-100 text-amber-900 border border-amber-300',
    modern: 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/40',
  },
  in_progress: {
    classic: 'bg-blue-100 text-blue-900 border border-blue-300',
    modern: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40',
  },
  completed: {
    classic: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
    modern: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/40',
  },
  cancelled: {
    classic: 'bg-slate-100 text-slate-700 border border-slate-300',
    modern: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/40',
  },
};

/** Icono del estado: el color solo no basta (daltonismo, pantallas de planta). */
export const ORDER_STATUS_ICON: Record<string, string> = {
  pending: '⏳',
  in_progress: '▶',
  completed: '✔',
  cancelled: '✕',
};
