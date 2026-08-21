import type { Pool, QueryResult } from 'pg';
import { getTenantContext } from '../auth/tenant-context.storage.js';

/**
 * Ejecuta una query con el contexto de tenant fijado.
 *
 * Usa set_config(..., true) (scope local a la transacción implícita de la
 * query) en lugar de false (scope de sesión): con pooling, un scope de
 * sesión puede sobrevivir al release() y filtrar el contexto del tenant A
 * a la siguiente query que tome esa conexión. El scope local muere con la
 * transacción, igual que hace withTenantTransaction().
 */
export async function tenantQuery(
  pool: Pool,
  text: string,
  params?: unknown[],
): Promise<QueryResult> {
  const context = getTenantContext();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [context.tenantId.toString()]);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
