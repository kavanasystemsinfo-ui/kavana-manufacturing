/**
 * Máquina de estados para el ciclo de vida de una orden de producción.
 *
 * Estados válidos: pending, in_progress, completed, cancelled
 *
 * Transiciones permitidas:
 * - pending → in_progress  (iniciar producción)
 * - pending → cancelled    (cancelar antes de empezar)
 * - in_progress → completed (terminar producción)
 * - in_progress → pending   (pausar/reanudar - solo supervisor/admin)
 *
 * Estados terminales (sin salidas):
 * - completed
 * - cancelled
 *
 * No se permite:
 * - Volver de completed a cualquier estado
 * - Volver de cancelled a cualquier estado
 * - Saltar estados (pending → completed directo)
 */

export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface StateTransition {
  from: OrderStatus;
  to: OrderStatus;
  allowed: boolean;
  reason?: string;
}

// Matriz de transiciones válidas
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'pending'],
  completed: [],
  cancelled: [],
};

/**
 * Verifica si una transición de estado es válida.
 * @param currentStatus Estado actual de la orden
 * @param targetStatus Estado al que se quiere transicionar
 * @returns Objeto con el resultado y la razón si no es válida
 */
export function validateOrderTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
): { valid: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { valid: false, reason: `La orden ya está en estado ${currentStatus}` };
  }

  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      reason: `Transición no permitida: ${currentStatus} → ${targetStatus}. Desde ${currentStatus} solo se puede ir a: ${allowed.join(', ') || 'ninguno (estado terminal)'}`,
    };
  }

  return { valid: true };
}

/**
 * Obtiene los estados posibles a los que se puede transicionar desde un estado dado.
 */
export function getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
  return [...(VALID_TRANSITIONS[currentStatus] ?? [])];
}

/**
 * Verifica si un estado es terminal (no tiene salidas).
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}