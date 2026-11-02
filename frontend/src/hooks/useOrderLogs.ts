import { useCallback, useEffect, useState } from 'react';
import { fetchOrderLogs, type MyTimeLog } from '../api/my-time-logs.js';
import { useHmiStore } from '../store/hmi-store.js';

/**
 * Bloques de la orden abierta. Se recarga cuando cambia la cola offline o
 * termina una sincronización, porque un bloque recién declarado no existe en el
 * servidor hasta que llega: justo entonces el operario espera verlo en la lista.
 */
export function useOrderLogs(orderId: string | null): { logs: MyTimeLog[]; isLoading: boolean } {
  const [logs, setLogs] = useState<MyTimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pendingCount = useHmiStore((s) => s.pendingCount);
  const isSyncing = useHmiStore((s) => s.isSyncing);

  const refresh = useCallback(async () => {
    if (!orderId) {
      setLogs([]);
      return;
    }
    setIsLoading(true);
    try {
      setLogs(await fetchOrderLogs(orderId));
    } catch {
      // Sin red o con el servidor arrancando se conserva lo último que se vio.
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pendingCount, isSyncing]);

  return { logs, isLoading };
}
