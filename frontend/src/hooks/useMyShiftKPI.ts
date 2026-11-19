import { useCallback, useEffect, useState } from 'react';
import { fetchMyTimeLogs, type MyTimeLog } from '../api/my-time-logs.js';
import { calculateShiftKPI, type ShiftKPI } from '../utils/shift-kpi.js';
import { ventanaDeTurno } from '../utils/planta-calendario.js';
import { useHmiStore } from '../store/hmi-store.js';

export interface MyShiftKPIState {
  kpi: ShiftKPI;
  blocks: MyTimeLog[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Indicadores del turno de hoy del operario autenticado.
 * Se recarga cuando cambia la cola offline o termina una sincronización: un
 * bloque recién declarado no cuenta hasta que llega al servidor, y ese es
 * justo el momento en el que el operario espera verlo reflejado.
 */
export function useMyShiftKPI(): MyShiftKPIState {
  const [blocks, setBlocks] = useState<MyTimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = useHmiStore((s) => s.pendingCount);
  const isSyncing = useHmiStore((s) => s.isSyncing);

  const refresh = useCallback(async () => {
    try {
      // Ventana del turno en curso según el calendario de planta (noche
      // 22:00-06:00 incluida), no el día natural: un turno de noche se ve entero.
      const ventana = ventanaDeTurno(new Date());
      const logs = await fetchMyTimeLogs({ from: ventana.inicio.toISOString(), to: ventana.fin.toISOString() });
      setBlocks(logs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar tu turno de hoy.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pendingCount, isSyncing]);

  return { kpi: calculateShiftKPI(blocks), blocks, isLoading, error, refresh };
}
