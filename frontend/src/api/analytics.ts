import { callApiWithTimeout } from './client.js';

const API_BASE = '/api/v1';

/** Punto de la serie diaria de producción (fecha en UTC, YYYY-MM-DD). */
export interface ProductionDailyPoint {
  date: string;
  produced: number;
  defects: number;
  target: number;
}

/** Motivo de parada del pareto, ya ordenado por horas descendentes. */
export interface DowntimeReason {
  reason: string;
  occurrences: number;
  hours: number;
}

/** OEE de planta para un día. */
export interface OeeDia {
  date: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface OeeWorkstation {
  workstation_id: string;
  workstation_name: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  /** El puesto no tiene partes en el periodo: el cero no es un resultado. */
  sin_datos?: boolean;
}

export async function fetchProductionDaily(days = 30): Promise<ProductionDailyPoint[]> {
  return callApiWithTimeout<ProductionDailyPoint[]>(
    `${API_BASE}/analytics/production-daily?days=${days}`,
  );
}

export async function fetchDowntimePareto(days = 30): Promise<DowntimeReason[]> {
  return callApiWithTimeout<DowntimeReason[]>(
    `${API_BASE}/analytics/downtime-pareto?days=${days}`,
  );
}

export async function fetchOeeDaily(days = 7): Promise<OeeDia[]> {
  return callApiWithTimeout<OeeDia[]>(`${API_BASE}/analytics/oee-daily?days=${days}`);
}

/** OEE por hora (UTC) para la tendencia intradía de OeeAdvancedTab. */
export async function fetchOeeHourly(hours = 24): Promise<OeeDia[]> {
  return callApiWithTimeout<OeeDia[]>(`${API_BASE}/analytics/oee-hourly?hours=${hours}`);
}

/** OEE por puesto en un periodo (endpoint ya existente del módulo OEE). */
export async function fetchOeeWorkstations(
  startDate: string,
  endDate: string,
): Promise<OeeWorkstation[]> {
  return callApiWithTimeout<OeeWorkstation[]>(
    `${API_BASE}/oee/workstations?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
  );
}
