export type WorkstationState = 'running' | 'stopped' | 'idle';

/**
 * Cuatro horas: si el último parte declarado es más antiguo, el puesto se
 * muestra sin actividad en lugar de afirmar que sigue en marcha. Sin este
 * corte, un puesto que terminó el turno de mañana aparecería verde toda la
 * tarde y el semáforo no serviría para nada.
 */
export const DEFAULT_STALE_AFTER_MINUTES = 240;

export interface WorkstationActivityInput {
  lastType: string | null;
  lastEndTime: string | Date | null;
}

/**
 * Estado del puesto a partir de su último parte declarado.
 *
 * Se decide sobre lo que el operario declaró, no sobre una medición de la
 * máquina: 'running' significa "el último parte fue de producción y es
 * reciente", que es lo que el sistema sabe de verdad.
 */
export function deriveWorkstationState(
  input: WorkstationActivityInput,
  now: Date = new Date(),
  staleAfterMinutes: number = DEFAULT_STALE_AFTER_MINUTES,
): WorkstationState {
  if (!input.lastType || !input.lastEndTime) return 'idle';

  const end = input.lastEndTime instanceof Date ? input.lastEndTime : new Date(input.lastEndTime);
  const endMs = end.getTime();
  if (!Number.isFinite(endMs)) return 'idle';

  const ageMinutes = (now.getTime() - endMs) / 60_000;
  if (ageMinutes > staleAfterMinutes) return 'idle';

  if (input.lastType === 'produccion') return 'running';
  if (input.lastType === 'parada') return 'stopped';
  return 'idle';
}
