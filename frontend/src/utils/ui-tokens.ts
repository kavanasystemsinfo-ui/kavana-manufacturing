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
