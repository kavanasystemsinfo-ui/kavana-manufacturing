/**
 * Nombre legible de un motivo de parada. Los partes guardan claves internas
 * (mantenimiento_menor); el panel las muestra en español corriente.
 */
const NOMBRES: Record<string, string> = {
  mantenimiento_menor: 'Mantenimiento menor',
  mantenimiento: 'Mantenimiento',
  cambio_formato: 'Cambio de formato',
  limpieza: 'Limpieza',
  ajuste_linea: 'Ajuste de línea',
  falta_material: 'Falta de material',
  averia_menor: 'Avería menor',
  averia: 'Avería',
};

export function etiquetaParada(motivo: string): string {
  const conocido = NOMBRES[motivo];
  if (conocido) return conocido;
  const limpio = motivo.trim().replace(/_+/g, ' ');
  if (limpio === '') return 'Sin motivo';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}
