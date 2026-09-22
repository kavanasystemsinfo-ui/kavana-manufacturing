import type { ShiftKPI } from '../../utils/shift-kpi.js';
import { formatNumber } from '../../utils/formatNumber.js';
import { Loading } from '../ui/Loading.js';
import { ErrorState } from '../ui/ErrorState.js';

interface ShiftKpiCardProps {
  kpi: ShiftKPI;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-kavana-steel/20 bg-kavana-surface/60 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-kavana-steel">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * Resumen del turno en curso. Los indicadores salen de los bloques que el
 * servidor tiene registrados para este operario hoy; si la carga falla se
 * dice explícitamente en lugar de mostrar ceros que parecerían producción real.
 */
export function ShiftKpiCard({ kpi, isLoading, error, onRetry }: ShiftKpiCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-kavana-steel/20 bg-kavana-dark/70 p-4">
        <Loading label="Cargando tu turno de hoy..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-kavana-steel/20 bg-kavana-dark/70 p-4">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-kavana-steel/20 bg-kavana-dark/70 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-kavana-steel">Mi turno hoy</p>
        <p className="text-xs text-slate-400">OEE personal {kpi.oeePersonal}%</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Horas netas" value={`${formatNumber(kpi.horasNetas)} h`} hint={`${formatNumber(kpi.horasProduccion)} h producción`} />
        <Metric label="Piezas buenas" value={formatNumber(kpi.buenas)} />
        <Metric label="Defectos" value={formatNumber(kpi.defectos)} hint={`Calidad ${kpi.calidad}%`} />
        <Metric label="Paradas" value={`${formatNumber(kpi.horasParada)} h`} />
      </div>
    </div>
  );
}
