export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/;

/** Una fila de `tenant_config_audit`. */
export interface ConfigAuditEntry {
  id: string;
  /** UUID del usuario que hizo el cambio; null si lo hizo algo sin usuario. */
  actor_user_id: string | null;
  /** Nombre del usuario, si sigue existiendo en la tabla de usuarios. */
  actor_username: string | null;
  action: 'feature_matrix' | 'custom_fields_schema' | 'hard_limits';
  previous_value: unknown;
  new_value: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditQuery {
  limit: number;
  offset: number;
  /** Instante ISO o null. Un 'desde' de día se ensancha al principio del día. */
  from: string | null;
  /** Instante ISO o null. Un 'hasta' de día se ensancha al final del día. */
  to: string | null;
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseBoundary(raw: string | undefined, edge: 'from' | 'to'): string | null {
  if (!raw) return null;
  if (DAY.test(raw)) return edge === 'from' ? `${raw}T00:00:00Z` : `${raw}T23:59:59Z`;
  if (INSTANT.test(raw)) return raw;
  return null;
}

/**
 * Normaliza los parámetros de consulta de la auditoría.
 *
 * Los valores fuera de rango se acotan en lugar de devolver error: el listado
 * es de solo lectura y una URL manipulada no debe dejar la pantalla en blanco.
 * En cambio una fecha mal formada se ignora entera, porque interpretarla mal
 * mostraría un rango de fechas distinto del que pidió quien la escribió.
 */
export function parseAuditQuery(query: { limit?: string; offset?: string; from?: string; to?: string }): AuditQuery {
  return {
    limit: clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT),
    offset: clampInt(query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
    from: parseBoundary(query.from, 'from'),
    to: parseBoundary(query.to, 'to'),
  };
}
