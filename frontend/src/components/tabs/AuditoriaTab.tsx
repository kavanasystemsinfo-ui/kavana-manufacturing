import { useEffect, useState } from 'react';
import { callApiWithTimeout } from '../../api/client.js';
import { usePeriodo } from '../../store/periodo-store.js';
import { PeriodoSelector } from '../PeriodoSelector.js';
import { describeActor, formatAuditDate, summarizeAuditEntry, type AuditEntry } from '../../utils/audit-format.js';

interface Props { isClassic?: boolean; }

const PAGE = 50;

/**
 * Historial de cambios de configuración del tenant.
 *
 * Los cambios los registra un disparador de la base de datos sobre `tenants`,
 * así que aparecen también los hechos por SQL directo, no solo los de esta
 * pantalla. Es de solo lectura: no hay forma de editar ni borrar el historial.
 */
export function AuditoriaTab({ isClassic }: Props) {
  const { from, to } = usePeriodo();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load(from, to, limit);
  }, [from, to, limit]);

  async function load(rangeFrom: string | null, rangeTo: string | null, rangeLimit: number) {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: String(rangeLimit) });
      if (rangeFrom) params.set('from', rangeFrom);
      if (rangeTo) params.set('to', rangeTo);
      const result = await callApiWithTimeout<{ entries: AuditEntry[]; total: number }>(
        `/tenant/capabilities/audit?${params.toString()}`,
      );
      setEntries(result?.entries ?? []);
      setTotal(result?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el historial');
    } finally {
      setLoading(false);
    }
  }

  const card = isClassic
    ? 'bg-white border border-gray-200 rounded-lg overflow-hidden'
    : 'bg-kavana-surface/60 backdrop-blur-sm rounded-xl border border-kavana-steel/20 overflow-hidden';
  const th = isClassic
    ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase'
    : 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-kavana-steel';
  const td = isClassic ? 'px-4 py-3 text-sm text-gray-800' : 'px-4 py-3 text-sm text-slate-200';
  const hint = isClassic ? 'text-xs text-gray-500' : 'text-xs text-slate-400';

  return (
    <div className={isClassic ? 'space-y-4' : 'space-y-4'}>
      <h2 className={isClassic ? 'text-lg font-semibold text-gray-700' : 'text-lg font-semibold'}>Auditoría de configuración</h2>

      <PeriodoSelector isClassic={isClassic} />

      <p className={hint}>
        Se registran los cambios de módulos, campos personalizados y límites, con el usuario que los hizo. Los cambios
        hechos directamente sobre la base de datos, sin pasar por la aplicación, aparecen como sistema: el registro no
        se pierde, solo que no hay usuario al que atribuirlos.
      </p>

      {error && (
        <div className={isClassic ? 'bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm' : 'bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-sm'}>
          {error}
          <button onClick={() => void load(from, to, limit)} className="ml-2 underline">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className={isClassic ? 'text-sm text-gray-400 py-4' : 'text-center py-8 text-slate-400'}>Cargando historial...</div>
      ) : entries.length === 0 ? (
        <div className={isClassic ? 'text-sm text-gray-500 py-4' : 'text-center py-8 text-slate-500'}>
          No hay cambios de configuración en el periodo elegido.
        </div>
      ) : (
        <>
          <div className={card}>
            <table className="w-full">
              <thead>
                <tr className={isClassic ? 'border-b border-gray-200' : 'border-b border-kavana-steel/20'}>
                  <th className={th}>Cuándo</th>
                  <th className={th}>Quién</th>
                  <th className={th}>Qué</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className={isClassic ? 'border-b border-gray-100' : 'border-b border-kavana-steel/10'}>
                    <td className={`${td} whitespace-nowrap`}>{formatAuditDate(entry.created_at)}</td>
                    <td className={`${td} ${entry.actor_user_id ? '' : isClassic ? 'text-gray-400' : 'text-slate-500'}`}>
                      {describeActor(entry.actor_user_id, entry.actor_username)}
                    </td>
                    <td className={td}>{summarizeAuditEntry(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <span className={hint}>
              {entries.length} de {total} cambios
            </span>
            {entries.length < total && (
              <button
                onClick={() => setLimit((l) => l + PAGE)}
                className={isClassic ? 'text-sm text-kavana-orange hover:underline' : 'text-sm text-kavana-orange hover:underline'}
              >
                Ver más
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
