import { partesEnMadrid } from './planta-calendario.js';

/**
 * Traduce los partes reales de un puesto (endpoint /oee/live-timeline) a lo
 * que dibuja la pestaña "Línea en vivo": segmentos con su posición en % sobre
 * el turno. Todo se calcula con los partes recibidos; aquí no hay nada
 * aleatorio ni inventado: lo que no tiene parte se pinta como "sin actividad".
 */

export interface ParteLinea {
  type: string;
  start_time: string;
  end_time: string;
  downtime_reason: string | null;
  produced_quantity: number;
  order_code: string | null;
}

export type TipoSegmento = 'produccion' | 'cambio' | 'parada' | 'sin_actividad';

export interface SegmentoLinea {
  tipo: TipoSegmento;
  inicio: Date;
  fin: Date;
  izquierdaPct: number;
  anchoPct: number;
  motivo: string | null;
  orden: string | null;
  producido: number;
}

export interface RangoTurno {
  inicio: Date;
  fin: Date;
}

/** Un parte de producción es "produccion"; una parada por cambio de formato es "cambio"; el resto de paradas, "parada". */
export function tipoDeParte(parte: Pick<ParteLinea, 'type' | 'downtime_reason'>): Exclude<TipoSegmento, 'sin_actividad'> {
  if (parte.type === 'produccion') return 'produccion';
  return parte.downtime_reason === 'cambio_formato' ? 'cambio' : 'parada';
}

/** Último instante del que hay datos entre todos los puestos (o null si no hay ninguno). */
export function datosHasta(partesPorPuesto: ParteLinea[][]): Date | null {
  let max = -Infinity;
  for (const partes of partesPorPuesto) {
    for (const parte of partes) {
      const fin = Date.parse(parte.end_time);
      if (Number.isFinite(fin) && fin > max) max = fin;
    }
  }
  return Number.isFinite(max) ? new Date(max) : null;
}

/**
 * Segmentos de un puesto dentro del turno. Los partes se recortan al turno y no
 * se solapan; los huecos entre partes son "sin_actividad". La franja llega
 * hasta `limite` (el último dato disponible o "ahora", lo que sea antes), no
 * hasta el final del turno: el futuro se deja en blanco.
 */
export function segmentosDeTurno(partes: ParteLinea[], turno: RangoTurno, limite: Date): SegmentoLinea[] {
  const inicio = turno.inicio.getTime();
  const total = turno.fin.getTime() - inicio;
  const tope = Math.min(turno.fin.getTime(), limite.getTime());
  if (total <= 0 || tope <= inicio) return [];

  const pct = (ms: number) => ((ms - inicio) / total) * 100;
  const segmentos: SegmentoLinea[] = [];
  const poner = (
    tipo: TipoSegmento,
    desde: number,
    hasta: number,
    extra: { motivo?: string | null; orden?: string | null; producido?: number } = {},
  ) => {
    segmentos.push({
      tipo,
      inicio: new Date(desde),
      fin: new Date(hasta),
      izquierdaPct: pct(desde),
      anchoPct: ((hasta - desde) / total) * 100,
      motivo: extra.motivo ?? null,
      orden: extra.orden ?? null,
      producido: extra.producido ?? 0,
    });
  };

  const ordenadas = [...partes].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
  let cursor = inicio;
  for (const parte of ordenadas) {
    const desde = Math.max(Date.parse(parte.start_time), cursor);
    const hasta = Math.min(Date.parse(parte.end_time), tope);
    if (!Number.isFinite(desde) || !Number.isFinite(hasta) || hasta <= desde) continue;
    if (desde > cursor) poner('sin_actividad', cursor, desde);
    poner(tipoDeParte(parte), desde, hasta, {
      motivo: parte.downtime_reason,
      orden: parte.order_code,
      producido: Number(parte.produced_quantity) || 0,
    });
    cursor = hasta;
  }
  if (cursor < tope) poner('sin_actividad', cursor, tope);
  return segmentos;
}

/** Posición (0-100) de "ahora" sobre el eje del turno; null si cae fuera. */
export function posicionAhora(turno: RangoTurno, ahora: Date): number | null {
  const t = ahora.getTime();
  const inicio = turno.inicio.getTime();
  const fin = turno.fin.getTime();
  if (t < inicio || t > fin || fin <= inicio) return null;
  return ((t - inicio) / (fin - inicio)) * 100;
}

export interface MarcaHora {
  pct: number;
  etiqueta: string;
}

/** Una marca por hora de reloj de Madrid, de la hora de inicio a la de fin del turno. */
export function marcasDeHora(turno: RangoTurno): MarcaHora[] {
  const inicio = turno.inicio.getTime();
  const total = turno.fin.getTime() - inicio;
  if (total <= 0) return [];
  const marcas: MarcaHora[] = [];
  for (let ms = inicio; ms <= turno.fin.getTime(); ms += 3600000) {
    const { h } = partesEnMadrid(new Date(ms));
    marcas.push({ pct: ((ms - inicio) / total) * 100, etiqueta: `${String(h).padStart(2, '0')}:00` });
  }
  return marcas;
}

export function horaMadrid(instante: Date): string {
  const { h, mi } = partesEnMadrid(instante);
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

/** Duración legible: "2 h 05 min", "45 min". */
export function duracionLegible(ms: number): string {
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`;
}

export function milisegundosDeTipo(segmentos: SegmentoLinea[], tipo: TipoSegmento): number {
  return segmentos
    .filter((s) => s.tipo === tipo)
    .reduce((suma, s) => suma + (s.fin.getTime() - s.inicio.getTime()), 0);
}
