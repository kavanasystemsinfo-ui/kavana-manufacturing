/**
 * Datos de una incidencia que el supervisor necesita para actuar: puesto,
 * operario, orden y hora. La incidencia guarda identificadores (UUID); aquí se
 * traducen a nombres con las listas que el panel ya tiene. Si un nombre no se
 * conoce, se omite: nunca se enseña un UUID.
 */
export interface IncidenciaConIds {
  workstation_id?: string | null;
  order_id?: string | null;
  reported_by?: string | null;
  created_at: string;
}

export interface NombresPorId {
  puestos?: Record<string, string>;
  ordenes?: Record<string, string>;
  operarios?: Record<string, string>;
}

export interface DetalleIncidencia {
  puesto: string | null;
  operario: string | null;
  orden: string | null;
  cuando: string;
}

/** «24/10/2026 14:35» en hora de España. */
export function fechaHoraIncidencia(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const fecha = d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
  const hora = d.toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${fecha} ${hora}`;
}

export function detalleIncidencia(inc: IncidenciaConIds, nombres: NombresPorId): DetalleIncidencia {
  return {
    puesto: (inc.workstation_id && nombres.puestos?.[inc.workstation_id]) || null,
    operario: (inc.reported_by && nombres.operarios?.[inc.reported_by]) || null,
    orden: (inc.order_id && nombres.ordenes?.[inc.order_id]) || null,
    cuando: fechaHoraIncidencia(inc.created_at),
  };
}
