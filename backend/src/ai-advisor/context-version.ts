/**
 * Versionado de contexto RAG — garantiza reproducibilidad.
 *
 * Cada vez que el AI Advisor recupera contexto de la BD para un prompt,
 * se genera un hash del contenido. Esto permite:
 *   - Trazabilidad: "esta respuesta usó el contexto v. a3f2b1c"
 *   - Debug: "el contexto cambió entre ayer y hoy, la respuesta difiere"
 *   - Auditoría: "qué datos vio el modelo cuando respondió X"
 */
import { createHash } from 'node:crypto';

export interface ContextVersion {
  /** SHA-256 truncado del contexto completo (órdenes + OEE + calidad + workblocks) */
  hash: string;
  /** Timestamp ISO de cuándo se generó */
  generatedAt: string;
  /** Tenant al que pertenece */
  tenantId: string;
  /** Número de órdenes incluidas en el contexto */
  orderCount: number;
  /** Número de registros OEE */
  oeeRecordCount: number;
  /** Número de incidencias de calidad */
  qualityRecordCount: number;
  /** Número de bloques de trabajo */
  workblockCount: number;
}

/**
 * Genera un hash de versión para un bundle de contexto.
 * Mismo contenido → mismo hash → misma versión.
 */
export function versionContext(
  tenantId: string,
  contextJSON: string,
  orderCount: number,
  oeeCount: number,
  qualityCount: number,
  workblockCount: number,
): ContextVersion {
  const hash = createHash('sha256')
    .update(contextJSON)
    .digest('hex')
    .slice(0, 12);

  return {
    hash,
    generatedAt: new Date().toISOString(),
    tenantId,
    orderCount,
    oeeRecordCount: oeeCount,
    qualityRecordCount: qualityCount,
    workblockCount,
  };
}

/**
 * Compara dos versiones y retorna true si el contenido cambió.
 */
export function contextChanged(a: ContextVersion, b: ContextVersion): boolean {
  return a.hash !== b.hash;
}
