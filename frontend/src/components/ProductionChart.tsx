import { useEffect, useMemo, useState } from 'react';
import { fetchProductionDaily, type ProductionDailyPoint } from '../api/analytics.js';
import { formatNumber } from '../utils/formatNumber.js';

/**
 * Producción de los últimos 30 días con los partes reales del backend.
 *
 * Antes generaba la serie con Math.random() y pintaba las alturas de las
 * barras con clases Tailwind interpoladas (`h-[${x}%]`), que Tailwind no
 * genera nunca: el gráfico salía vacío y encima con datos inventados. Ahora
 * la altura va en style (siempre se pinta) y la serie viene de la API.
 */

const DIAS = 30;

/** Eje de días en la misma zona que agrupa el backend (UTC). */
function ultimosDias(dias: number): string[] {
  const fin = new Date();
  fin.setUTCHours(0, 0, 0, 0);
  const serie: string[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    serie.push(new Date(fin.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  }
  return serie;
}

/** Techo redondeado a una magnitud legible (43.965 -> 50.000). */
function escalaBonita(max: number): number {
  if (max <= 0) return 1;
  const magnitud = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / magnitud) * magnitud;
}

export function ProductionChart() {
  const [datos, setDatos] = useState<ProductionDailyPoint[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetchProductionDaily(DIAS)
      .then((puntos) => { if (!cancelado) { setDatos(puntos); setError(null); } })
      .catch(() => { if (!cancelado) setError('No se pudo cargar la producción diaria'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, []);

  // Eje completo de 30 días: los días sin partes cuentan como cero, no se
  // saltan (si no, el eje se comprime y ayer aparece al lado de hace un mes).
  const serie = useMemo(() => {
    const porFecha = new Map(datos.map((p) => [p.date, p]));
    return ultimosDias(DIAS).map(
      (date) => porFecha.get(date) ?? { date, produced: 0, defects: 0, target: 0 },
    );
  }, [datos]);

  const escala = useMemo(
    () => escalaBonita(Math.max(...serie.map((d) => Math.max(d.produced, d.target)), 0)),
    [serie],
  );

  const promedioSemanal = useMemo(() => {
    const ultimaSemana = serie.slice(-7);
    if (ultimaSemana.length === 0) return 0;
    return ultimaSemana.reduce((acc, d) => acc + d.produced, 0) / ultimaSemana.length;
  }, [serie]);

  const sinDatos = serie.every((d) => d.produced === 0 && d.target === 0);
  const pctPromedio = escala > 0 ? Math.min((promedioSemanal / escala) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Producción Diaria (Últimos 30 días)
        </h3>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-green-600 font-medium">
            Promedio semanal: {formatNumber(Math.round(promedioSemanal))} unidades/día
          </span>
          <span className="text-slate-500">
            ({new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })})
          </span>
        </div>
      </div>

      {cargando ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-400">
          Cargando producción…
        </div>
      ) : error ? (
        <div className="h-48 flex items-center justify-center text-sm text-red-500 text-center px-4">
          {error}
        </div>
      ) : sinDatos ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-400 text-center px-4">
          Sin producción registrada en los últimos 30 días
        </div>
      ) : (
        <>
          <div className="h-48 flex gap-2">
            {/* Eje Y */}
            <div className="w-10 pb-6 flex flex-col justify-between items-end text-xs text-slate-400">
              <span>{formatNumber(escala)}</span>
              <span>{formatNumber(escala / 2)}</span>
              <span>0</span>
            </div>

            <div className="relative flex-1">
              {/* Líneas de referencia */}
              <div className="absolute inset-x-0 top-0 border-t border-slate-200/50" />
              <div className="absolute inset-x-0 top-1/2 border-t border-slate-200/50" />
              <div className="absolute inset-x-0 bottom-6 border-t border-slate-200/50" />

              {/* Zona de barras (deja 1.5rem abajo para las fechas) */}
              <div className="absolute inset-x-0 top-0 bottom-6">
                {/* Media semanal */}
                <div
                  className="absolute inset-x-0 h-0.5 bg-green-500/60"
                  style={{ bottom: `${pctPromedio}%` }}
                />
                <div className="absolute inset-0 flex items-end gap-[2px]">
                  {serie.map((dia) => {
                    const pctProduced = escala > 0 ? (dia.produced / escala) * 100 : 0;
                    const pctTarget = escala > 0 ? (dia.target / escala) * 100 : 0;
                    const pctDefects =
                      dia.produced > 0 ? Math.min((dia.defects / dia.produced) * 100, 100) : 0;

                    return (
                      <div
                        key={dia.date}
                        className="flex-1 h-full flex items-end justify-center gap-[1px]"
                        title={`${dia.date}: ${formatNumber(dia.produced)} uds (objetivo ${formatNumber(dia.target)})`}
                      >
                        <div
                          className="w-1/2 bg-slate-200/70 rounded-t-[2px]"
                          style={{ height: `${pctTarget}%` }}
                        />
                        <div
                          className="w-1/2 bg-kavana-orange rounded-t-[2px] relative"
                          style={{ height: `${pctProduced}%` }}
                        >
                          {dia.defects > 0 && (
                            <div
                              className="absolute inset-x-0 top-0 bg-red-500/60 rounded-t-[2px]"
                              style={{ height: `${pctDefects}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fechas: una etiqueta de cada 5 días para que no se pisen */}
              <div className="absolute inset-x-0 bottom-0 h-6 flex items-center gap-[2px]">
                {serie.map((dia, index) => (
                  <div key={dia.date} className="flex-1 text-center text-[10px] text-slate-500">
                    {index % 5 === 0 || index === serie.length - 1
                      ? new Date(`${dia.date}T00:00:00`).getDate()
                      : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex mt-3 gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-kavana-orange rounded" />
              <span>Producción</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-slate-200/70 rounded" />
              <span>Objetivo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500/60 rounded" />
              <span>Defectos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 bg-green-500/60 rounded" />
              <span>Media semanal</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
