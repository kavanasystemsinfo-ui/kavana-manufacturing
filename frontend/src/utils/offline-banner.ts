export interface OfflineBannerState {
  text: string;
  detail: string;
}

/**
 * Contenido del aviso de desconexión.
 *
 * El mensaje es deliberadamente tranquilizador: el operario puede seguir
 * registrando partes porque la cola es local, y lo que necesita saber no es
 * que "falla la red" sino que su trabajo no se pierde y cuánto queda por subir.
 */
export function offlineBannerState(input: { isOnline: boolean; pendingCount: number }): OfflineBannerState | null {
  if (input.isOnline) return null;

  const pending = Number.isFinite(input.pendingCount) && input.pendingCount > 0 ? Math.floor(input.pendingCount) : 0;

  return {
    text: 'Sin conexión. Puedes seguir trabajando: los partes se guardan en el dispositivo.',
    detail:
      pending === 0
        ? 'No hay partes pendientes de enviar'
        : pending === 1
          ? '1 parte pendiente de enviar'
          : `${pending} partes pendientes de enviar`,
  };
}
