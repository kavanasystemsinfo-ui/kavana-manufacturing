/**
 * Bloques que genera el botón de pausa y el de reanudar. Los dos diseños del panel
 * registran exactamente lo mismo; aquí vive la regla para que no se escriba dos veces.
 */
export type BlockType = 'produccion' | 'parada';

/** Argumentos de `registerWorkBlock`: tipo, inicio, fin, motivo, buenas, defectos, observaciones. */
export type BlockArgs = [BlockType, string, string, string | null, number, number, string | null];

/** Una parada se registra en el instante en que se pulsa (inicio = fin) y dura hasta el bloque siguiente. */
export function pauseBlock(reason: string, now: Date = new Date()): BlockArgs {
  const at = now.toISOString();
  return ['parada', at, at, reason, 0, 0, null];
}

/** Reanudar abre un bloque de producción de 1 minuto sin piezas; las cantidades se declaran después. */
export function resumeBlock(now: Date = new Date()): BlockArgs {
  const start = now.toISOString();
  const end = new Date(now.getTime() + 60 * 1000).toISOString();
  return ['produccion', start, end, null, 0, 0, null];
}
