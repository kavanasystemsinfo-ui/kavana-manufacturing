import { useEffect, useMemo, useState } from 'react';
import { fetchDowntimePareto, type DowntimeReason } from '../api/analytics.js';

/**
 * Pareto de paradas con los motivos reales de los partes (top 5 + "Otros").
 *
 * Antes las horas salían de Math.random() y las alturas de las barras se
 * generaban como clases Tailwind interpoladas, que no existen: el gráfico
 * quedaba vacío. Ahora la altura va en style y los datos vienen del backend.
 */

const TOP = 5;
const EJE = [100, 80, 60, 40, 20, 0];

interface FilaPareto {
  reason: string;
  hours: number;
  percentage: number;
  acumulado: number;
}

export function DowntimePareto() {
  const [datos, setDatos] = useState<DowntimeReason[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetchDowntimePareto(30)
      .then((motivos) => { if (!cancelado) { setDatos(motivos); setError(null); } })
      .catch(() => { if (!cancelado) setError('No se pudo cargar el pareto de paradas'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, []);

  const filas: FilaPareto[] = useMemo(() => {
    const total = datos.reduce((suma, d) => suma + d.hours, 0);
    const principales = datos.slice(0, TOP).map((d) => ({ ...d }));
    const resto = datos.slice(TOP).reduce((suma, d) => suma + d.hours, 0);

    const columnas: { reason: string; hours: number }[] = principales;
    if (resto > 0) columnas.push({ reason: 'Otros', hours: resto });

    let acumulado = 0;
    return columnas.map((columna) => {
      const percentage = total > 0 ? (columna.hours / total) * 100 : 0;
      acumulado += percentage;
      return { ...columna, percentage, acumulado };
    });
  }, [datos]);

  const cubierto = filas.length > 0 ? Math.round(filas[filas.length - 1].acumulado) : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Pareto de Paradas (Top 5)
        </h3>
        <div className="text-sm text-slate-500">
          {filas.length > 0 ? `Cubre ${cubierto}% del tiempo perdido` : 'Sin datos'}
        </div>
      </div>

      {cargando ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-400">
          Cargando paradas…
        </div>
      ) : error ? (
        <div className="h-48 flex items-center justify-center text-sm text-red-500 text-center px-4">
          {error}
        </div>
      ) : filas.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-400 text-center px-4">
          Sin paradas registradas en los últimos 30 días
        </div>
      ) : (
        <>
          <div className="h-48 flex gap-2">
            {/* Eje Y: horas perdidas como % del total del periodo */}
            <div className="w-8 h-48 pb-9 flex flex-col justify-between items-end text-xs text-slate-400">
              {EJE.map((pct) => (
                <span key={pct}>{pct}%</span>
              ))}
            </div>

            <div className="relative flex-1 h-48">
              {/* Zona de barras (deja 2.25rem abajo para las etiquetas) */}
              <div className="absolute inset-x-0 top-0 bottom-9">
                {[0, 20, 40, 60, 80].map((pct) => (
                  <div
                    key={pct}
                    className="absolute inset-x-0 border-t border-slate-200/50"
                    style={{ top: `${pct}%` }}
                  />
                ))}
                <div className="absolute inset-x-0 bottom-0 border-t border-slate-200/50" />

                <div className="absolute inset-0 flex items-end gap-2 px-1">
                  {filas.map((fila) => (
                    <div
                      key={fila.reason}
                      className="flex-1 h-full flex items-end justify-center"
                      title={`${fila.reason}: ${fila.hours.toFixed(1)} h (${fila.percentage.toFixed(1)}%)`}
                    >
                      <div
                        className="w-3/4 bg-amber-400 rounded-t"
                        style={{ height: `${Math.min(fila.percentage, 100)}%` }}
                      />
                    </div>
                  ))}
                </div>

                {/* Curva de porcentaje acumulado (Pareto) */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <polyline
                    points={filas
                      .map((fila, i) => `${((i + 0.5) / filas.length) * 100},${100 - fila.acumulado}`)
                      .join(' ')}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                  {filas.map((fila, i) => (
                    <circle
                      key={fila.reason}
                      cx={((i + 0.5) / filas.length) * 100}
                      cy={100 - fila.acumulado}
                      r="1.5"
                      fill="#6366f1"
                    />
                  ))}
                </svg>
              </div>

              {/* Motivos y % */}
              <div className="absolute inset-x-0 bottom-0 h-9 flex items-start gap-2 px-1">
                {filas.map((fila) => (
                  <div key={fila.reason} className="flex-1 min-w-0 text-center">
                    <div
                      className="text-[10px] text-slate-500 truncate leading-tight"
                      title={fila.reason}
                    >
                      {fila.reason}
                    </div>
                    <div className="text-[10px] text-slate-800 font-medium leading-tight">
                      {fila.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex mt-3 gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-400 rounded" />
              <span>Causas de paro</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 bg-indigo-500 rounded" />
              <span>Porcentaje acumulado</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
