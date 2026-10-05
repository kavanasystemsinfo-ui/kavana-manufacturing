/**
 * Filtros de la lista de órdenes. Los aplica el backend: traer el histórico
 * entero son más de mil órdenes y media pantalla de scroll por orden.
 */
export interface OrderFilters {
  /** Estados a mostrar. Vacío = todos. */
  status: string[];
  /** '' = todos los puestos. */
  workstationId: string;
  /** Texto libre: código de orden, modelo o puesto. */
  q: string;
  limit: number;
}

export const ORDENES_POR_PAGINA = 60;

/**
 * Por defecto se mira lo que está vivo en planta. El histórico se consulta a
 * propósito, no se pinta solo.
 */
export const DEFAULT_ORDER_FILTERS: OrderFilters = {
  status: ['pending', 'in_progress'],
  workstationId: '',
  q: '',
  limit: ORDENES_POR_PAGINA,
};

/**
 * Traduce los filtros del panel a la query del endpoint de órdenes.
 */
export function buildOrderQuery(
  filters?: Partial<OrderFilters> & { offset?: number },
): string {
  if (!filters) return '';

  const params = new URLSearchParams();
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  if (filters.workstationId) {
    params.set('workstation_id', filters.workstationId);
  }
  const q = filters.q?.trim();
  if (q) {
    params.set('q', q);
  }
  params.set('limit', String(filters.limit ?? ORDENES_POR_PAGINA));
  if (filters.offset) {
    params.set('offset', String(filters.offset));
  }

  return `?${params.toString()}`;
}

export interface EstadoPreset {
  value: string;
  label: string;
  status: string[];
}

/**
 * Los estados del backend, con un preset cómodo para lo que se mira a diario.
 * El histórico no se enseña por defecto: se pide a propósito.
 */
export const ORDER_STATUS_PRESETS: EstadoPreset[] = [
  { value: 'activas', label: 'Activas (pendiente y en progreso)', status: ['pending', 'in_progress'] },
  { value: 'pending', label: 'Pendientes', status: ['pending'] },
  { value: 'in_progress', label: 'En progreso', status: ['in_progress'] },
  { value: 'completed', label: 'Completadas', status: ['completed'] },
  { value: 'cancelled', label: 'Canceladas', status: ['cancelled'] },
  { value: 'todas', label: 'Todas (histórico completo)', status: [] },
];

/** Qué preset corresponde a la lista de estados que hay seleccionada. */
export function presetFromStatus(status: string[]): string {
  const ordenada = [...status].sort().join(',');
  const preset = ORDER_STATUS_PRESETS.find(
    (p) => [...p.status].sort().join(',') === ordenada,
  );
  return preset?.value ?? 'activas';
}

/** Los estados que hay que pedirle al backend para un preset dado. */
export function statusFromPreset(value: string): string[] {
  const preset = ORDER_STATUS_PRESETS.find((p) => p.value === value);
  return preset ? [...preset.status] : ['pending', 'in_progress'];
}

/** Etiqueta legible de un estado, para listas y tablas. */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
