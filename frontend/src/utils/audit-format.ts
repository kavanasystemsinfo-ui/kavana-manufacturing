export interface AuditEntry {
  id: string;
  actor_user_id: string | null;
  action: 'feature_matrix' | 'custom_fields_schema' | 'hard_limits' | string;
  previous_value: unknown;
  new_value: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const ACTION_LABELS: Record<string, string> = {
  feature_matrix: 'Módulos',
  custom_fields_schema: 'Campos personalizados',
  hard_limits: 'Límites',
};

const MAX_NOMBRADOS = 3;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Apartados de primer nivel que cambian entre dos valores.
 *
 * La comparación es por contenido serializado: el valor llega del JSONB y las
 * referencias siempre son distintas, así que comparar con === marcaría como
 * cambiado todo lo que se toca, aunque se guarde lo mismo.
 */
export function changedKeys(previous: unknown, next: unknown): string[] {
  const antes = asRecord(previous);
  const despues = asRecord(next);
  const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

  return [...claves].filter((clave) => JSON.stringify(antes[clave]) !== JSON.stringify(despues[clave]));
}

/** El trigger no guarda el usuario, así que se dice explícitamente. */
export function describeActor(actorUserId: string | null): string {
  if (!actorUserId) return 'Sistema (sin usuario registrado)';
  return actorUserId.slice(0, 8);
}

export function summarizeAuditEntry(entry: AuditEntry): string {
  const etiqueta = ACTION_LABELS[entry.action] ?? entry.action;
  const claves = changedKeys(entry.previous_value, entry.new_value);

  if (claves.length === 0) return `${etiqueta}: sin cambios en el contenido`;
  if (claves.length <= MAX_NOMBRADOS) return `${etiqueta}: cambia ${claves.join(', ')}`;
  return `${etiqueta}: ${claves.length} apartados`;
}

export function formatAuditDate(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
