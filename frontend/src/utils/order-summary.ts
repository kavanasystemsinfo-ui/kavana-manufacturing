/**
 * Resumen de una orden para el operario: cuánto lleva hecho, si está parada y
 * qué bloques ha registrado. Todo sale de la orden y de sus bloques; nada se
 * recalcula en el servidor.
 */
export interface SummaryOrder {
  quantity?: number | string | null;
  produced_quantity?: number | string | null;
  defect_quantity?: number | string | null;
}

export interface SummaryLog {
  id: string;
  type: 'produccion' | 'parada';
  downtime_reason: string | null;
  start_time: string;
  end_time: string;
  produced_quantity?: number | string | null;
  defect_quantity?: number | string | null;
}

export interface OrderSummaryData {
  planned: number;
  produced: number;
  defects: number;
  remaining: number;
  /** 0-100, nunca pasa de 100. */
  pct: number;
  /** Defectos sobre el total fabricado (buenas + defectos), con un decimal. */
  defectRate: number;
  stopped: boolean;
  stopReason: string | null;
  /** Inicio de la parada en curso, para el cronómetro; null si no está parada. */
  stoppedSince: string | null;
  stopsCount: number;
  stopMinutes: number;
  /** Los últimos bloques, del más reciente al más antiguo. */
  recent: SummaryLog[];
}

export const RECENT_LIMIT = 5;

function num(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** «mantenimiento_menor» → «Mantenimiento menor»: los motivos de parada llegan como clave. */
export function humanizeReason(reason: string | null | undefined): string | null {
  const text = reason?.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function byStartDesc(a: SummaryLog, b: SummaryLog): number {
  const d = Date.parse(b.start_time) - Date.parse(a.start_time);
  return d !== 0 ? d : Date.parse(b.end_time) - Date.parse(a.end_time);
}

function minutesBetween(startMs: number, endMs: number): number {
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs ? (endMs - startMs) / 60000 : 0;
}

/**
 * Una parada se registra con inicio = fin (el instante en que se pulsa), así que
 * dura hasta que empieza el bloque siguiente; la última, hasta `nowMs`. Si el
 * bloque declara una duración mayor, vale esa.
 */
export function stopMinutesOf(log: { start_time: string; end_time: string }, nextStartMs: number | null, nowMs: number): number {
  const start = Date.parse(log.start_time);
  const declared = minutesBetween(start, Date.parse(log.end_time));
  const untilNext = minutesBetween(start, nextStartMs ?? nowMs);
  return Math.max(declared, untilNext);
}

/** Inicio del primer bloque posterior al dado, o null si es el último. */
export function nextStartMs(sortedAsc: Array<{ start_time: string }>, index: number): number | null {
  const from = Date.parse(sortedAsc[index].start_time);
  const next = sortedAsc.slice(index + 1).find((l) => Date.parse(l.start_time) > from);
  return next ? Date.parse(next.start_time) : null;
}

export function summarizeOrder(order: SummaryOrder, logs: SummaryLog[], now: Date = new Date()): OrderSummaryData {
  const planned = num(order.quantity);
  const produced = num(order.produced_quantity);
  const defects = num(order.defect_quantity);
  const sorted = [...logs].sort(byStartDesc);
  const paradas = logs.filter((l) => l.type === 'parada');
  const asc = [...logs].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
  const stopMinutes = asc.reduce(
    (sum, l, i) => (l.type === 'parada' ? sum + stopMinutesOf(l, nextStartMs(asc, i), now.getTime()) : sum),
    0,
  );
  const last = sorted[0];
  const made = produced + defects;
  return {
    planned,
    produced,
    defects,
    remaining: Math.max(0, planned - produced),
    pct: planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0,
    defectRate: made > 0 ? Math.round((defects / made) * 1000) / 10 : 0,
    stopped: last?.type === 'parada',
    stopReason: last?.type === 'parada' ? humanizeReason(last.downtime_reason) : null,
    stoppedSince: last?.type === 'parada' ? last.start_time : null,
    stopsCount: paradas.length,
    stopMinutes: Math.round(stopMinutes),
    recent: sorted.slice(0, RECENT_LIMIT),
  };
}

/** 45 → «45 min»; 65 → «1 h 05 min»; 120 → «2 h». */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, '0')} min`;
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function thousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Una línea legible por bloque: «10:00–12:00 · 12.000 buenas · 40 defectos» o «10:20 · Parada: Faltan piezas». */
export function describeBlock(log: SummaryLog): string {
  if (log.type === 'parada') {
    const reason = humanizeReason(log.downtime_reason) ?? 'sin motivo';
    return `${hhmm(log.start_time)} · Parada: ${reason}`;
  }
  const good = thousands(num(log.produced_quantity));
  const bad = num(log.defect_quantity);
  const base = `${hhmm(log.start_time)}–${hhmm(log.end_time)} · ${good} buenas`;
  return bad > 0 ? `${base} · ${thousands(bad)} defectos` : base;
}

/** Minutos enteros desde `since` hasta `now`; 0 si la fecha no es válida o es futura. */
export function minutesSince(since: string | null, now: Date = new Date()): number {
  if (!since) return 0;
  const ms = now.getTime() - Date.parse(since);
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 60000) : 0;
}

/** Etiqueta de estado de la orden: «Produciendo» o «En parada: motivo · 12 min». */
export function statusLabel(summary: Pick<OrderSummaryData, 'stopped' | 'stopReason'>, stoppedMinutes: number): string {
  if (!summary.stopped) return 'Produciendo';
  const reason = summary.stopReason ? `: ${summary.stopReason}` : '';
  return `En parada${reason} · ${formatMinutes(stoppedMinutes)}`;
}
