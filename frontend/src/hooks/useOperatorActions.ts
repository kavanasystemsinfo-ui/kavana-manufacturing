import { useState } from 'react';
import { useHmiStore } from '../store/hmi-store.js';
import { pauseBlock, resumeBlock } from '../utils/block-actions.js';
import { orderLabel } from '../utils/order-queue.js';

/**
 * Acciones y pantallas auxiliares del panel de operario que son idénticas en los
 * dos diseños (Clásico y Moderno): pausar, reanudar y el cierre de turno. Cada
 * diseño solo decide cómo se ven.
 */
export function useOperatorActions(availableOrders: ReadonlyArray<{ id: string; code?: string | null }>) {
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [showShift, setShowShift] = useState(false);

  const handleConfirmPause = async (reason: string) => {
    await useHmiStore.getState().registerWorkBlock(...pauseBlock(reason));
    setIsPauseModalOpen(false);
  };

  const handleResume = async () => {
    await useHmiStore.getState().registerWorkBlock(...resumeBlock());
  };

  /** «Orden 4465» a partir del id; si la orden ya no está en la lista, un id corto. */
  const labelOf = (id: string) => {
    const order = availableOrders.find((o) => o.id === id);
    return orderLabel({ id, code: order?.code ?? null });
  };

  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' });

  return { isPauseModalOpen, setIsPauseModalOpen, showShift, setShowShift, handleConfirmPause, handleResume, labelOf, dateLabel };
}
