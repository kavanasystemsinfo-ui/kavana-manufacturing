/**
 * Resumen de cierre de turno: lo que el operario hizo hoy, por orden y por motivo
 * de parada, listo para leer o pasar al compañero del turno siguiente.
 */
import { calculateShiftKPI, type ShiftKPI } from './shift-kpi.js';
import { formatMinutes, humanizeReason, nextStartMs, stopMinutesOf } from './order-summary.js';
import { formatThousands } from './quick-block.js';

export interface ShiftLog {
  order_id: string;
  type: 'produccion' | 'parada';
  downtime_reason: string | null;
  start_time: string;
  end_time: string;
  produced_quantity?: number | null;
  defect_quantity?: number | null;
}

export interface ShiftOrderRow {
  orderId: string;
  label: string;
  good: number;
  defects: number;
  stops: number;
  stopMinutes: number;
}

export interface ShiftStopRow {
  reason: string;
  count: number;
  minutes: number;
}

export interface ShiftSummary {
  kpi: ShiftKPI;
  orders: ShiftOrderRow[];
  stops: ShiftStopRow[];
  stopMinutes: number;
}

function num(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function summarizeShift(logs: ShiftLog[], labelOf: (orderId: string) => string, now: Date = new Date()): ShiftSummary {
  const sorted = [...logs].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
  const orders = new Map<string, ShiftOrderRow>();
  const stops = new Map<string, ShiftStopRow>();
  let stopMinutes = 0;

  const row = (orderId: string): ShiftOrderRow => {
    let r = orders.get(orderId);
    if (!r) {
      r = { orderId, label: labelOf(orderId), good: 0, defects: 0, stops: 0, stopMinutes: 0 };
      orders.set(orderId, r);
    }
    return r;
  };

  sorted.forEach((log, i) => {
    const r = row(log.order_id);
    if (log.type === 'produccion') {
      r.good += num(log.produced_quantity);
      r.defects += num(log.defect_quantity);
      return;
    }
    const minutes = stopMinutesOf(log, nextStartMs(sorted, i), now.getTime());
    r.stops += 1;
    r.stopMinutes += minutes;
    stopMinutes += minutes;
    const reason = humanizeReason(log.downtime_reason) ?? 'Sin motivo';
    const s = stops.get(reason) ?? { reason, count: 0, minutes: 0 };
    s.count += 1;
    s.minutes += minutes;
    stops.set(reason, s);
  });

  const round = (n: number) => Math.round(n);
  return {
    kpi: calculateShiftKPI(logs),
    orders: [...orders.values()].map((o) => ({ ...o, stopMinutes: round(o.stopMinutes) })).sort((a, b) => b.good - a.good),
    stops: [...stops.values()].map((s) => ({ ...s, minutes: round(s.minutes) })).sort((a, b) => b.minutes - a.minutes),
    stopMinutes: round(stopMinutes),
  };
}

/** Texto plano del cierre, para copiar y pegar en el relevo del turno. */
export function shiftReportText(summary: ShiftSummary, header: { date: string; operator: string | null; workstation: string | null }): string {
  const who = [header.operator, header.workstation].filter(Boolean).join(' · ');
  const lines = [`Cierre de turno · ${header.date}${who ? ` · ${who}` : ''}`];
  lines.push(
    `Producción: ${formatThousands(summary.kpi.buenas)} buenas, ${formatThousands(summary.kpi.defectos)} defectos (calidad ${summary.kpi.calidad} %)`,
  );
  lines.push(`Paradas: ${summary.stops.reduce((n, s) => n + s.count, 0)} · ${formatMinutes(summary.stopMinutes)}`);
  if (summary.orders.length > 0) {
    lines.push('', 'Por orden:');
    for (const o of summary.orders) {
      const stop = o.stops > 0 ? ` · ${o.stops} ${o.stops === 1 ? 'parada' : 'paradas'} (${formatMinutes(o.stopMinutes)})` : '';
      lines.push(`- ${o.label}: ${formatThousands(o.good)} buenas, ${formatThousands(o.defects)} defectos${stop}`);
    }
  }
  if (summary.stops.length > 0) {
    lines.push('', 'Paradas por motivo:');
    for (const s of summary.stops) lines.push(`- ${s.reason}: ${s.count} (${formatMinutes(s.minutes)})`);
  }
  return lines.join('\n');
}
