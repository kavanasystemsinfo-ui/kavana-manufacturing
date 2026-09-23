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
  { status: 'abierto', title: 'Abierto' },
  { status: 'en_progreso', title: 'En Progreso' },
  { status: 'resuelto', title: 'Resuelto' },
  { status: 'cerrado', title: 'Cerrado' },
];

/**
 * Incidencias que no caen en ninguna columna: estado desconocido, dato viejo o
 * sin estado. El tablero las muestra aparte a propósito, porque una incidencia
 * que desaparece de la vista es una incidencia que nadie sigue.
 */
export function incidenciasHuerfanas<T extends IncidenciaKanban>(items: T[]): T[] {
  const conColumna = new Set(COLUMNAS_INCIDENCIAS.map((c) => c.status));
  return items.filter((item) => !item.status || !conColumna.has(item.status));
}
