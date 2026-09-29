const DEMO_READONLY_MARK = 'Demo de solo lectura';

/**
 * El blindaje de la demo responde 403 con este texto cuando rechaza algo del
 * tenant demo. Desde la decisión de Jorge (2026-09-29) eso es solo el BORRADO
 * (y la edición de catálogo): mover el estado de órdenes e incidencias sí
 * persiste. En cualquier caso no es un fallo del usuario ni del sistema, es una
 * regla del producto, así que la UI no puede pintarlo como error rojo.
 */
export function isDemoReadOnlyError(message: unknown): boolean {
  return typeof message === 'string' && message.includes(DEMO_READONLY_MARK);
}

export const DEMO_MOVE_NOTICE =
  'Movimiento registrado en pantalla. En la demo el histórico es de solo lectura, así que la orden vuelve a su estado real al actualizar.';

export const DEMO_DELETE_NOTICE =
  'En la demo no se borra: los datos del histórico son de solo lectura.';

/** Confirmación de un movimiento que SÍ se ha guardado. */
export function orderMoveNotice(code: string | null | undefined, status: string): string {
  const etiqueta = ORDEN_ESTADO_TEXTO[status] ?? status;
  return `La orden ${code || 'sin número'} pasa a ${etiqueta}.`;
}

export const ORDER_CREATED_NOTICE = 'Orden creada. Ya aparece en la columna Pendiente.';

const ORDEN_ESTADO_TEXTO: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
