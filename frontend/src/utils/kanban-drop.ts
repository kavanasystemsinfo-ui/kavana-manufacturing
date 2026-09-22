export interface KanbanItem {
  id: string;
  status: string;
}

/** Las columnas se identifican en el drag con este prefijo, para distinguirlas de las tarjetas. */
export const COLUMN_ID_PREFIX = 'col:';

export interface DropTargetLike {
  id: string;
  columnStatus?: string | null;
}

/**
 * Decide a qué estado se mueve la tarjeta soltada.
 *
 * Devuelve null cuando no hay que hacer nada (se soltó en su propia columna,
 * fuera del tablero, o el id no corresponde a nada conocido). Devolver null en
 * lugar de repetir el estado actual evita una llamada a la API que no cambia
 * nada y el parpadeo del refresco.
 */
export function resolveDropTarget(
  activeId: string,
  over: DropTargetLike | null,
  items: KanbanItem[],
): string | null {
  if (!over) return null;

  const active = items.find((item) => item.id === activeId);
  if (!active) return null;

  let target: string | null = null;

  if (over.id.startsWith(COLUMN_ID_PREFIX)) {
    target = over.id.slice(COLUMN_ID_PREFIX.length);
  } else if (typeof over.columnStatus === 'string') {
    target = over.columnStatus;
  } else {
    const overItem = items.find((item) => item.id === over.id);
    target = overItem?.status ?? null;
  }

  if (!target || target === active.status) return null;
  return target;
}
