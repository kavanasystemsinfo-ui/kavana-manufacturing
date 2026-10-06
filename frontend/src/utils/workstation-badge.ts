export interface WorkstationBadge {
  label: string;
  /** Clases del punto de color. */
  dot: string;
  /** Clases del contenedor del chip. */
  chip: string;
}

const IDLE: WorkstationBadge = {
  label: 'Sin actividad',
  dot: 'bg-amber-400',
  chip: 'border-amber-500/50 bg-amber-500/20 text-amber-600',
};

/**
 * Traducción del estado del puesto a semáforo visual.
 *
 * Un estado desconocido o ausente cae en "sin actividad" a propósito: si el
 * backend devolviera algo que la UI no entiende, es más honesto decir que no
 * hay actividad que pintar un verde de falsa normalidad.
 */
export function workstationBadge(state: string | null | undefined): WorkstationBadge {
  if (state === 'running') {
    return {
      label: 'En marcha',
      dot: 'bg-green-400',
      chip: 'border-green-500/50 bg-green-500/20 text-green-600',
    };
  }

  if (state === 'stopped') {
    return {
      label: 'Parada',
      dot: 'bg-red-500',
      chip: 'border-red-600/50 bg-red-600/20 text-red-600',
    };
  }

  return IDLE;
}
