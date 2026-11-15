import { useEffect, useMemo, useState } from 'react';
import {
  fetchLiveTimeline,
  fetchOeeWorkstations,
  type LiveTimelineWorkstation,
  type OeeWorkstation,
} from '../api/analytics.js';
import { etiquetaParada } from '../utils/parada-etiqueta.js';
import { formatThousands } from '../utils/quick-block.js';
import {
  datosHasta,
  duracionLegible,
  horaMadrid,
  marcasDeHora,
  milisegundosDeTipo,
  posicionAhora,
  segmentosDeTurno,
  type SegmentoLinea,
  type TipoSegmento,
} from '../utils/live-line.js';
import {
  proximaApertura,
  turnoActual,
  turnosDeJornada,
  ultimoTurno,
  type Turno,
} from '../utils/planta-calendario.js';

const REFRESCO_MS = 60_000;
const DATOS_ANTIGUOS_MS = 2 * 3600_000;

const COLOR: Record<TipoSegmento, string> = {
  produccion: 'bg-green-700',
  parada: 'bg-red-700',
  cambio: 'bg-amber-600',
  sin_actividad: 'bg-slate-300',
};

const NOMBRE: Record<TipoSegmento, string> = {
  produccion: 'Produciendo',
  parada: 'Parada',
  cambio: 'Cambio de formato',
  sin_actividad: 'Sin parte registrado',
};

function textoTooltip(s: SegmentoLinea): string {
  const base = `${NOMBRE[s.tipo]}: ${horaMadrid(s.inicio)} - ${horaMadrid(s.fin)}`;
  const motivo = s.motivo && s.tipo !== 'produccion' ? ` | ${etiquetaParada(s.motivo)}` : '';
  const orden = s.orden && s.tipo !== 'sin_actividad' ? ` | Orden ${s.orden}` : '';
  return base + motivo + orden;
}

function colorOee(oee: number): string {
  if (oee > 85) return 'text-green-700';
  if (oee > 70) return 'text-amber-700';
  return 'text-red-700';
}

function fechaLarga(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export function LiveLineTab() {
  const [ahora, setAhora] = useState(() => new Date());
  const [elegido, setElegido] = useState<number | null>(null);
  const [puestos, setPuestos] = useState<LiveTimelineWorkstation[]>([]);
  const [oee, setOee] = useState<Map<string, OeeWorkstation>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // El reloj de la pantalla avanza cada minuto: mueve el marcador de "ahora" y
  // decide si el turno sigue en curso.
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), REFRESCO_MS);
    return () => window.clearInterval(id);
  }, []);

  const actual = useMemo(() => turnoActual(ahora), [ahora]);
  const referencia: Turno | null = actual ?? ultimoTurno(ahora);
  const jornadaRef = referencia?.jornada ?? null;
  const opciones = useMemo(() => (jornadaRef ? turnosDeJornada(jornadaRef) : []), [jornadaRef]);
  const turno: Turno | null = opciones.find((t) => t.inicio.getTime() === elegido) ?? referencia;
  const turnoEnCurso = turno !== null && actual !== null && turno.inicio.getTime() === actual.inicio.getTime();

  const inicioMs = turno?.inicio.getTime() ?? null;
  const finMs = turno?.fin.getTime() ?? null;
  // Solo un turno en curso se vuelve a pedir cada minuto; uno terminado se pide una vez.
  const refresco = turnoEnCurso ? Math.floor(ahora.getTime() / REFRESCO_MS) : 0;

  // Carga de los partes reales del turno elegido; se repite cada minuto solo si está en curso.
  useEffect(() => {
    if (inicioMs === null || finMs === null) {
      setCargando(false);
      return;
    }
    let cancelado = false;
    const desde = new Date(inicioMs).toISOString();
    const hasta = new Date(finMs).toISOString();
    Promise.all([fetchLiveTimeline(desde, hasta), fetchOeeWorkstations(desde, hasta)])
      .then(([lineas, oeeLista]) => {
        if (cancelado) return;
        setPuestos(lineas);
        setOee(new Map(oeeLista.map((o) => [o.workstation_id, o])));
        setError(null);
      })
      .catch(() => {
        if (!cancelado) setError('No se han podido cargar los datos de la línea. Se volverá a intentar en un minuto.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [inicioMs, finMs, refresco]);

  const ultimoDato = useMemo(() => datosHasta(puestos.map((p) => p.blocks)), [puestos]);
  // La franja llega hasta el último dato (o hasta ahora, lo que ocurra antes): el futuro queda en blanco.
  const limite = useMemo(() => {
    if (!turno) return ahora;
    if (!turnoEnCurso) return turno.fin;
    return ultimoDato ? new Date(Math.min(ultimoDato.getTime(), ahora.getTime())) : ahora;
  }, [turno, turnoEnCurso, ultimoDato, ahora]);

  const marcas = useMemo(() => (turno ? marcasDeHora(turno) : []), [turno]);
  const filas = useMemo(
    () =>
      puestos.map((p) => ({
        puesto: p,
        segmentos: turno ? segmentosDeTurno(p.blocks, turno, limite) : [],
      })),
    [puestos, turno, limite],
  );

  const ahoraPct = turno && turnoEnCurso ? posicionAhora(turno, ahora) : null;

  const resumen = useMemo(() => {
    const conActividad = filas.filter((f) => f.puesto.blocks.length > 0).length;
    const producido = filas.reduce(
      (s, f) => s + f.puesto.blocks.reduce((a, b) => a + (b.type === 'produccion' ? b.produced_quantity : 0), 0),
      0,
    );
    const paradaMs = filas.reduce(
      (s, f) => s + milisegundosDeTipo(f.segmentos, 'parada') + milisegundosDeTipo(f.segmentos, 'cambio'),
      0,
    );
    const valores = filas
      .map((f) => oee.get(f.puesto.workstation_id))
      .filter((o): o is OeeWorkstation => !!o && !o.sin_datos);
    const oeeMedio = valores.length > 0 ? valores.reduce((s, o) => s + o.oee, 0) / valores.length : null;
    return { conActividad, producido, paradaMs, oeeMedio };
  }, [filas, oee]);

  const datosAntiguos = turnoEnCurso && ultimoDato !== null && ahora.getTime() - ultimoDato.getTime() > DATOS_ANTIGUOS_MS;
  const reabre = !actual ? proximaApertura(ahora) : null;

  let insignia: { texto: string; clase: string };
  if (!actual) insignia = { texto: 'PLANTA CERRADA', clase: 'bg-slate-100 text-slate-700' };
  else if (datosAntiguos) insignia = { texto: 'DATOS ANTIGUOS', clase: 'bg-amber-100 text-amber-800' };
  else if (turnoEnCurso) insignia = { texto: 'TURNO EN CURSO', clase: 'bg-green-100 text-green-700' };
  else insignia = { texto: 'TURNO TERMINADO', clase: 'bg-slate-100 text-slate-700' };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Línea en Vivo</h3>
          <p className="text-sm text-slate-500">
            Qué ha hecho cada puesto durante el turno, según los partes registrados. La pantalla se actualiza sola cada minuto.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${insignia.clase}`}>
            {turnoEnCurso && !datosAntiguos && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
            {insignia.texto}
          </div>
          {turno && ultimoDato && (
            <span className="text-xs text-slate-500">Datos hasta las {horaMadrid(ultimoDato)}</span>
          )}
        </div>
      </div>

      {!actual && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <strong>Planta cerrada.</strong>{' '}
          {reabre ? `Reabre el ${fechaLarga(reabre)} a las ${horaMadrid(reabre)}. ` : ''}
          {turno ? 'Abajo, el último turno trabajado.' : 'Todavía no hay ningún turno que mostrar.'}
        </div>
      )}

      {datosAntiguos && ultimoDato && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Los últimos datos son de las {horaMadrid(ultimoDato)} (hace {duracionLegible(ahora.getTime() - ultimoDato.getTime())}).
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      {turno && (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Turno">
          {opciones.map((t) => {
            const activo = t.inicio.getTime() === turno.inicio.getTime();
            return (
              <button
                key={t.inicio.getTime()}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => setElegido(t.inicio.getTime())}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  activo ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t.etiqueta}
                <span className="ml-1 text-xs opacity-80">
                  {horaMadrid(t.inicio)}-{horaMadrid(t.fin)}
                </span>
              </button>
            );
          })}
          <span className="text-xs text-slate-500 ml-1">
            {turno.etiqueta} del {fechaLarga(new Date(turno.fin.getTime() - 1))}
          </span>
        </div>
      )}

      {turno && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
          <div className="min-w-[860px]">
            {/* Eje horario: mismo grid y mismas columnas que las filas */}
            <div className="grid grid-cols-[12rem_1fr_10rem] items-end border-b border-slate-200">
              <div className="text-xs font-medium text-slate-500 px-2 py-1">
                PUESTO
                {turnoEnCurso && <span className="ml-1 font-normal normal-case">· punto: estado a las {horaMadrid(limite)}</span>}
              </div>
              <div className="relative h-6 mx-3">
                {marcas.map((m, i) => (
                  <span
                    key={i}
                    className={`absolute top-0 text-xs text-slate-500 ${i === 0 ? '' : i === marcas.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                    style={{ left: `${m.pct}%` }}
                  >
                    {m.etiqueta}
                  </span>
                ))}
              </div>
              <div className="text-xs font-medium text-slate-500 px-2 py-1 text-right">AVANCE · OEE</div>
            </div>

            {filas.map(({ puesto, segmentos }) => {
              const ultimo = segmentos.length > 0 ? segmentos[segmentos.length - 1] : null;
              const o = oee.get(puesto.workstation_id);
              const orden = puesto.order;
              const avance = orden && orden.quantity > 0 ? Math.min((orden.produced_quantity / orden.quantity) * 100, 100) : 0;
              return (
                <div key={puesto.workstation_id} className="grid grid-cols-[12rem_1fr_10rem] items-center h-20 border-b border-slate-200/60">
                  <div className="px-2 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* El punto es el estado en el último dato: solo tiene sentido con el turno en curso. */}
                      {turnoEnCurso && (
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${ultimo ? COLOR[ultimo.tipo] : 'bg-slate-300'}`}
                          title={ultimo ? `Estado a las ${horaMadrid(limite)}: ${NOMBRE[ultimo.tipo]}` : 'Sin partes en el turno'}
                        ></span>
                      )}
                      <span className="text-sm font-medium text-slate-900 truncate" title={puesto.name}>{puesto.name}</span>
                    </div>
                    <div className="text-xs text-slate-500">{puesto.code}</div>
                    {orden && <div className="text-xs text-orange-800 mt-0.5">Orden {orden.code}</div>}
                  </div>

                  <div className="relative h-6 mx-3 rounded bg-slate-100">
                    {marcas.map((m, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200" style={{ left: `${m.pct}%` }} />
                    ))}
                    {segmentos.map((s, i) => (
                      <div
                        key={i}
                        className={`absolute top-0 h-full ${COLOR[s.tipo]} ${s.tipo === 'sin_actividad' ? 'opacity-60' : ''}`}
                        style={{ left: `${s.izquierdaPct}%`, width: `${s.anchoPct}%` }}
                        title={textoTooltip(s)}
                      >
                        {s.tipo === 'produccion' && s.orden && s.anchoPct > 12 && (
                          <span className="block truncate px-1 text-[10px] leading-6 !text-white">{s.orden}</span>
                        )}
                      </div>
                    ))}
                    {ahoraPct !== null && (
                      <div className="absolute -top-2 -bottom-2 w-0.5 bg-red-500/80 pointer-events-none" style={{ left: `${ahoraPct}%` }} />
                    )}
                  </div>

                  <div className="px-2 text-right">
                    {orden ? (
                      <>
                        <div className="text-xs text-slate-500">Orden</div>
                        <div className="text-sm font-bold text-slate-900">
                          {formatThousands(orden.produced_quantity)} / {formatThousands(orden.quantity)}
                        </div>
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-0.5 ml-auto">
                          <div className="h-full bg-kavana-orange rounded-full" style={{ width: `${avance}%` }} />
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500">Sin orden</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      OEE{' '}
                      {o && !o.sin_datos ? (
                        <span className={`text-sm font-bold ${colorOee(o.oee)}`}>{o.oee.toFixed(1)}%</span>
                      ) : (
                        <span className="text-sm font-bold text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!cargando && filas.length === 0 && (
              <div className="h-32 flex items-center justify-center text-slate-500">No hay puestos configurados</div>
            )}
            {cargando && filas.length === 0 && (
              <div className="h-32 flex items-center justify-center text-slate-500">Cargando el turno…</div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600" aria-label="Leyenda">
            {(['produccion', 'parada', 'cambio', 'sin_actividad'] as TipoSegmento[]).map((tipo) => (
              <span key={tipo} className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded-sm ${COLOR[tipo]} ${tipo === 'sin_actividad' ? 'opacity-60' : ''}`}></span>
                {NOMBRE[tipo]}
              </span>
            ))}
            {ahoraPct !== null && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-0.5 h-3 bg-red-500"></span>
                Ahora
              </span>
            )}
          </div>
        </div>
      )}

      {turno && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Puestos con actividad</p>
            <p className="text-2xl font-bold text-green-700">
              {resumen.conActividad}
              <span className="text-base font-medium text-slate-500"> de {filas.length}</span>
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Producido en el turno</p>
            <p className="text-2xl font-bold text-slate-900">{formatThousands(resumen.producido)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Tiempo de paradas</p>
            <p className="text-2xl font-bold text-red-700">{resumen.paradaMs > 0 ? duracionLegible(resumen.paradaMs) : '0 min'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Rendimiento medio (OEE)</p>
            <p className="text-2xl font-bold text-indigo-600">{resumen.oeeMedio !== null ? `${resumen.oeeMedio.toFixed(1)}%` : 'Sin datos'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
