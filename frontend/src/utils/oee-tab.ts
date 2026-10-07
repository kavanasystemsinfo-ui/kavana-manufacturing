import type { OeeDia, OeeWorkstation } from '../api/analytics.js';

/**
 * Contrato de traducción de los endpoints de analytics/OEE a lo que dibuja
 * OeeAdvancedTab. Antes la pestaña rellenaba ranking y tendencia con
 * Math.random (Perfiladora marcaba 73 % cuando la real era 98,7 %): todos los
 * datos de la pestaña pasan por aquí.
 */

/** Punto de la tendencia SVG: el backend manda 0-100, el gráfico espera 0-1. */
export interface PuntoTendencia {
  date: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

/** Fila del ranking/tabla de puestos con los porcentajes ya en fracción. */
export interface PuestoRanking {
  id: string;
  name: string;
  code: string;
  /** null = el puesto no tiene partes en el periodo: el cero no es un resultado. */
  oee: number | null;
  availability: number | null;
  performance: number | null;
  quality: number | null;
}

const aFraccion = (valor: number): number => {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    return 0;
  }
  return numero / 100;
};

export function aPuntosTendencia(serie: OeeDia[]): PuntoTendencia[] {
  return serie.map((p) => ({
    date: p.date,
    oee: aFraccion(p.oee),
    availability: aFraccion(p.availability),
    performance: aFraccion(p.performance),
    quality: aFraccion(p.quality),
  }));
}

/**
 * Ranking de puestos de peor a mejor con los valores reales de
 * `/oee/workstations`. Los `sin_datos` quedan al final con `null`: un puesto
 * sin partes no es el peor del turno.
 */
export function rankingDesde(
  puestos: OeeWorkstation[],
  estaciones: { id: string; name: string; code: string }[],
): PuestoRanking[] {
  const codigoPorId = new Map(estaciones.map((e) => [e.id, e.code]));

  const filas: PuestoRanking[] = puestos.map((p) => {
    const sinDatos = p.sin_datos === true || aFraccion(p.oee) <= 0;
    return {
      id: p.workstation_id,
      name: p.workstation_name,
      code: codigoPorId.get(p.workstation_id) ?? '—',
      oee: sinDatos ? null : aFraccion(p.oee),
      availability: sinDatos ? null : aFraccion(p.availability),
      performance: sinDatos ? null : aFraccion(p.performance),
      quality: sinDatos ? null : aFraccion(p.quality),
    };
  });

  return filas.sort((a, b) => {
    if (a.oee === null && b.oee === null) return a.name.localeCompare(b.name);
    if (a.oee === null) return 1;
    if (b.oee === null) return -1;
    return a.oee - b.oee;
  });
}

/**
 * Eje X proporcional al tiempo: devuelve una funcion fecha → % de ancho
 * (0 = primera fecha de la serie, 100 = ultima). Repartir por indice mintiria:
 * la serie horaria solo trae las horas con bloques y un hueco de 14 h no
 * puede verse como una hora mas.
 */
export function escalaX(serie: PuntoTendencia[]): (fecha: string) => number {
  const t0 = Date.parse(serie[0]?.date ?? '');
  const t1 = Date.parse(serie[serie.length - 1]?.date ?? '');
  const span = Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0 ? t1 - t0 : 1;
  return (fecha: string) => ((Date.parse(fecha) - t0) / span) * 100;
}

/**
 * Segmentos de polyline SVG para una serie: el eje X sale de `escalaX` y la
 * linea se corta cuando entre dos puntos hay mas de `pasoMs * 1.5` de
 * distancia (horas/dias sin bloques), para no dibujar un tramo inventado
 * donde no hubo actividad.
 */
export function puntosDeLinea(
  serie: PuntoTendencia[],
  campo: 'oee' | 'availability' | 'performance' | 'quality',
  pasoMs: number,
): string[] {
  if (serie.length < 2) return [];
  const x = escalaX(serie);
  const segmentos: string[] = [];
  let actual: string[] = [];
  let previo: number | null = null;

  for (const punto of serie) {
    const t = Date.parse(punto.date);
    if (previo !== null && t - previo > pasoMs * 1.5) {
      if (actual.length > 1) segmentos.push(actual.join(' '));
      actual = [];
    }
    actual.push(`${x(punto.date).toFixed(2)},${(100 - punto[campo] * 100).toFixed(2)}`);
    previo = t;
  }
  if (actual.length > 1) segmentos.push(actual.join(' '));
  return segmentos;
}
