/** Etiquetas de estado de incidencia, en femenino plural para los títulos de columna. */
export const INCIDENCIA_STATUS_LABEL: Record<string, string> = {
  abierto: 'Abiertas',
  en_progreso: 'En progreso',
  resuelto: 'Resueltas',
  cerrado: 'Cerradas',
};

/**
 * Texto del aviso que se muestra al mover una incidencia de columna.
 *
 * Incluye el título porque el supervisor puede haber arrastrado varias seguidas
 * y necesita saber cuál acaba de moverse; y usa la etiqueta en español para no
 * enseñar el valor crudo del backend.
 */
export function incidenciaMoveNotice(title: string, newStatus: string): string {
  const label = INCIDENCIA_STATUS_LABEL[newStatus] ?? newStatus;
  return `«${title}» movida a ${label}`;
}
