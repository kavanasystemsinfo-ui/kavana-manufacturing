export type PeriodoMode = 'hoy' | 'semana' | 'mes' | 'mes_anterior' | 'todo' | 'personalizado';

export interface Periodo {
  mode: PeriodoMode;
  /** Día ISO (AAAA-MM-DD). Solo se usa con 'personalizado'. */
  from: string | null;
  to: string | null;
}

export const PERIODO_LABELS: Record<PeriodoMode, string> = {
  hoy: 'Hoy',
  semana: 'Esta semana',
  mes: 'Este mes',
  mes_anterior: 'Mes anterior',
  todo: 'Todo',
  personalizado: 'Personalizado',
};

export const PERIODO_MODES: PeriodoMode[] = ['hoy', 'semana', 'mes', 'mes_anterior', 'todo', 'personalizado'];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function toDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Rango de días de un modo de periodo.
 *
 * Se calcula sobre fechas locales, no UTC: para un turno de mañana en Paterna,
 * "hoy" es el día del calendario del usuario, no el de Greenwich. Los modos se
 * calculan al vuelo en lugar de guardarse, así que un enlace compartido con
 * "mes" sigue significando el mes de quien lo abre.
 */
export function calcRange(mode: PeriodoMode, now: Date = new Date()): { from: string | null; to: string | null } {
  const hoy = toDay(now);

  switch (mode) {
    case 'hoy':
      return { from: hoy, to: hoy };

    case 'semana': {
      // La semana empieza el lunes: getDay() devuelve 0 el domingo.
      const offset = (now.getDay() + 6) % 7;
      const lunes = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      return { from: toDay(lunes), to: hoy };
    }

    case 'mes':
      return { from: toDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: hoy };

    case 'mes_anterior': {
      // El día 0 del mes actual es el último del mes anterior, y así febrero
      // sale con 28 o 29 días sin tener que saber cuántos tiene.
      const primero = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const ultimo = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toDay(primero), to: toDay(ultimo) };
    }

    case 'todo':
    case 'personalizado':
      return { from: null, to: null };
  }
}

export function isPeriodoMode(value: string): value is PeriodoMode {
  return (PERIODO_MODES as string[]).includes(value);
}

/** Serializa el periodo para la barra de direcciones, para poder compartirlo. */
export function periodoToQuery(periodo: Periodo): string {
  const params = new URLSearchParams({ periodo: periodo.mode });
  if (periodo.mode === 'personalizado' && periodo.from && periodo.to) {
    params.set('desde', periodo.from);
    params.set('hasta', periodo.to);
  }
  return params.toString();
}

/**
 * Lee el periodo de la URL. Devuelve null si no hay nada utilizable, y en ese
 * caso quien llama decide el periodo por defecto (no se inventa aquí).
 *
 * Un modo personalizado sin fechas válidas se descarta entero: es mejor caer al
 * periodo por defecto que mostrar un rango incompleto sin avisar.
 */
export function periodoFromQuery(search: string): Periodo | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const mode = params.get('periodo');
  if (!mode || !isPeriodoMode(mode)) return null;

  if (mode === 'personalizado') {
    const from = params.get('desde');
    const to = params.get('hasta');
    if (!from || !to || !DAY.test(from) || !DAY.test(to) || from > to) return null;
    return { mode, from, to };
  }

  return { mode, from: null, to: null };
}
