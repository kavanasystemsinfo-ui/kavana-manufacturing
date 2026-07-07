import type { PoolClient } from 'pg';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import { postgresPool } from './postgres.provider.js';

export async function withTenantTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const context = getTenantContext();
  const client = await postgresPool.connect();

  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [context.tenantId.toString()]);

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
