/**
 * Cifras de órdenes para las tarjetas del resumen.
 *
 * El listado del panel solo trae las órdenes abiertas (pendientes y en proceso)
 * y con un tope, así que contar ahí las completadas o las canceladas daba
 * siempre cero y «Total» se quedaba clavado en el tope. Si el servidor da los
 * recuentos de todo el histórico se usan esos; si no, se cae al listado.
 */
export interface ConteosServidor {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total: number;
}

export interface OrdenConEstado {
  status: string;
}

export interface ConteosOrdenes {
  total: number;
  pendientes: number;
  enProceso: number;
  completadas: number;
  canceladas: number;
}

export function conteosDeOrdenes(
  servidor: ConteosServidor | null | undefined,
  listado: readonly OrdenConEstado[],
): ConteosOrdenes {
  if (servidor) {
    return {
      total: servidor.total,
      pendientes: servidor.pending,
      enProceso: servidor.in_progress,
      completadas: servidor.completed,
      canceladas: servidor.cancelled,
    };
  }
  const cuenta = (estado: string) => listado.filter((o) => o.status === estado).length;
  return {
    total: listado.length,
    pendientes: cuenta('pending'),
    enProceso: cuenta('in_progress'),
    completadas: cuenta('completed'),
    canceladas: cuenta('cancelled'),
  };
}
