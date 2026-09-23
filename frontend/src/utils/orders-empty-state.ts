/**
 * Qué decirle al operario cuando su lista de órdenes sale vacía.
 *
 * Antes el panel decía siempre «No hay órdenes asignadas a tu puesto», que es
 * cierto pero no accionable cuando el problema es que el operario no tiene
 * puesto asignado: eso no lo puede arreglar él y no sabe a quién acudir.
 */
export interface OrdersEmptyState {
  title: string;
  description: string;
}

export function ordersEmptyState(orderSearch: string, workstationName: string | null): OrdersEmptyState {
  if (orderSearch) {
    return {
      title: 'Sin resultados',
      description: 'No se encontraron órdenes con ese criterio',
    };
  }
  if (!workstationName) {
    return {
      title: 'Sin puesto asignado',
      description: 'Todavía no tienes un puesto asignado. Pídeselo a tu supervisor para empezar a trabajar.',
    };
  }
  return {
    title: 'Sin órdenes disponibles',
    description: 'No hay órdenes asignadas a tu puesto',
  };
}
