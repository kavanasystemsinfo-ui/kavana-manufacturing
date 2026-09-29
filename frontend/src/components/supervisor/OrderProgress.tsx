import { formatNumber } from '../../utils/formatNumber.js';

interface OrderProgressProps {
  isClassic?: boolean;
  produced: number | string;
  quantity: number;
  defects: number | string;
  /** En la tabla el bloque va compacto; en la tarjeta, con etiqueta. */
  compact?: boolean;
}

/**
 * Progreso de una orden, en un solo sitio para las dos vistas y los dos temas.
 *
 * Antes la barra al 0 % era una línea gris claro sobre blanco: en una pantalla
 * de planta con reflejos eso no se ve, y el número quedaba descolgado arriba.
 */
export function OrderProgress({ isClassic, produced, quantity, defects, compact }: OrderProgressProps) {
  const producidas = Number(produced) || 0;
  const defectuosas = Number(defects) || 0;
  const pct = quantity > 0 ? Math.min(100, Math.round((producidas / quantity) * 100)) : 0;

  const relleno = pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-kavana-orange' : '';
  const pista = isClassic ? 'bg-slate-200 border border-slate-300' : 'bg-kavana-steel/30';

  return (
    <div className={compact ? 'min-w-[132px]' : 'mt-2'}>
      {!compact && (
        <div className="mb-1 flex items-center justify-between text-xs opacity-70">
          <span>Progreso</span>
          <span className="whitespace-nowrap font-semibold">
            {formatNumber(producidas)} / {formatNumber(quantity)} ({pct}%)
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Progreso de la orden: ${pct}%`}
        className={`h-2.5 w-full overflow-hidden rounded-full ${pista}`}
      >
        <div className={`h-full rounded-full transition-all duration-500 ${relleno}`} style={{ width: `${pct}%` }} />
      </div>
      {compact && (
        <p className="mt-1 whitespace-nowrap text-xs font-semibold opacity-80">
          {formatNumber(producidas)} / {formatNumber(quantity)} ({pct}%)
        </p>
      )}
      {defectuosas > 0 && (
        <p className={`mt-1 text-xs font-semibold ${isClassic ? 'text-red-700' : 'text-rose-300'}`}>
          Defectos: {formatNumber(defectuosas)}
        </p>
      )}
    </div>
  );
}
