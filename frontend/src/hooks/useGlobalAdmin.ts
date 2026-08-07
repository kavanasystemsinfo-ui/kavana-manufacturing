import { useEffect, useState, useCallback } from 'react';
import { listTenants } from '../api/admin-entities.js';
import type { GlobalTenant } from '../api/admin-entities.js';

export type GlobalTab = 'tenants' | 'create';

export function useGlobalAdmin() {
  const [tab, setTab] = useState<GlobalTab>('tenants');
  const [tenants, setTenants] = useState<GlobalTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setTenants(await listTenants());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { tab, setTab, tenants, loading, error, setError, reload };
}
