/**
 * Tablero de incidencias: columnas y control de lo que no encaja.
 *
 * Los cuatro estados son los que acepta el backend (`dto.ts`). El tablero se
 * monta sobre `components/ui/KanbanColumns.tsx`, que ya resuelve el arrastre y el
 * soltado en una columna vacía.
 */
export interface IncidenciaKanban {
  id: string;
  status?: string | null;
}

export const COLUMNAS_INCIDENCIAS: ReadonlyArray<{ status: string; title: string }> = [
  { status: 'abierto', title: 'Abiertas' },
  { status: 'en_progreso', title: 'En progreso' },
  { status: 'resuelto', title: 'Resueltas' },
  { status: 'cerrado', title: 'Cerradas' },
];

/**
 * El color de cada estado de incidencia, en los dos temas. Estaba duplicado en la
 * lista de cada rol con valores distintos por pantalla: el mismo estado podía
 * verse distinto según dónde lo miraras. Ahora el par vive aquí.
 */
export const COLOR_ESTADO_INCIDENCIA: Record<string, { classic: string; modern: string }> = {
  abierto: {
    classic: 'bg-red-100 text-red-800 border-red-300',
    modern: 'bg-red-500/20 text-red-300 ring-red-500/40',
  },
  en_progreso: {
    classic: 'bg-blue-100 text-blue-800 border-blue-300',
    modern: 'bg-blue-500/20 text-blue-300 ring-blue-500/40',
  },
  resuelto: {
    classic: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    modern: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40',
  },
  cerrado: {
    classic: 'bg-slate-100 text-slate-600 border-slate-300',
    modern: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
  },
};

/** Clase de color de un estado de incidencia para el tema en uso. Los estados sin
 * color definido (dato viejo) se quedan neutros: destacan sin gritar. */
export function colorEstadoIncidencia(status: string | null | undefined, isClassic?: boolean): string {
  const par = status ? COLOR_ESTADO_INCIDENCIA[status] : undefined;
  if (!par) return isClassic ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-500/10 text-slate-300 ring-slate-500/30';
  return isClassic ? par.classic : par.modern;
}

/**
 * Incidencias que no caen en ninguna columna: estado desconocido, dato viejo o
 * sin estado. El tablero las muestra aparte a propósito, porque una incidencia
 * que desaparece de la vista es una incidencia que nadie sigue.
 */
export function incidenciasHuerfanas<T extends IncidenciaKanban>(items: T[]): T[] {
  const conColumna = new Set(COLUMNAS_INCIDENCIAS.map((c) => c.status));
  return items.filter((item) => !item.status || !conColumna.has(item.status));
}
