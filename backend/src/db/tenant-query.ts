import type { Pool, QueryResult } from 'pg';
import { getTenantContext } from '../auth/tenant-context.storage.js';

export async function tenantQuery(
  pool: Pool,
  text: string,
  params?: unknown[],
): Promise<QueryResult> {
  const context = getTenantContext();
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [context.tenantId.toString()]);
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
