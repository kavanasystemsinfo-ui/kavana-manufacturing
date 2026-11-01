/**
 * Resumen en una frase de cómo va la planta hoy, para quien mira el panel sin
 * saber qué es un OEE. Es la cabecera del resumen: un semáforo, una frase y
 * tres cifras que la justifican.
 */
export type NivelPlanta = 'verde' | 'ambar' | 'rojo' | 'sin_datos';

export interface EntradaEstadoPlanta {
  /** OEE de planta de hoy (0..100) o null si hoy no hay partes. */
  oee: number | null;
  /** % de cumplimiento del objetivo de producción de hoy o null si no hay objetivo. */
  cumplimiento: number | null;
  /** Incidencias abiertas que paran o ponen en riesgo la producción. */
  bloqueantes: number;
}

export interface EstadoPlanta {
  nivel: NivelPlanta;
  titulo: string;
  detalle: string[];
}

export const OBJETIVO_OEE = 85;

const ORDEN: Record<NivelPlanta, number> = { sin_datos: -1, verde: 0, ambar: 1, rojo: 2 };

function nivelPorOee(oee: number): NivelPlanta {
  return oee >= OBJETIVO_OEE ? 'verde' : oee >= 70 ? 'ambar' : 'rojo';
}

function nivelPorCumplimiento(c: number): NivelPlanta {
  return c >= 95 ? 'verde' : c >= 80 ? 'ambar' : 'rojo';
}

export function estadoPlanta({ oee, cumplimiento, bloqueantes }: EntradaEstadoPlanta): EstadoPlanta {
  const textoBloqueantes =
    bloqueantes > 0
      ? `${bloqueantes} ${bloqueantes === 1 ? 'incidencia bloqueante' : 'incidencias bloqueantes'}`
      : 'Sin incidencias bloqueantes';

  if (oee === null && cumplimiento === null) {
    return {
      nivel: 'sin_datos',
      titulo: 'Todavía no hay datos de producción de hoy',
      detalle: [textoBloqueantes],
    };
  }

  let nivel: NivelPlanta = 'verde';
  if (oee !== null && ORDEN[nivelPorOee(oee)] > ORDEN[nivel]) nivel = nivelPorOee(oee);
  if (cumplimiento !== null && ORDEN[nivelPorCumplimiento(cumplimiento)] > ORDEN[nivel]) {
    nivel = nivelPorCumplimiento(cumplimiento);
  }
  if (bloqueantes > 0 && nivel === 'verde') nivel = 'ambar';

  const titulo =
    nivel === 'verde'
      ? 'La planta va bien'
      : nivel === 'ambar'
        ? 'La planta funciona, con margen de mejora'
        : 'La planta está por debajo de lo esperado';

  const detalle: string[] = [];
  if (oee !== null) detalle.push(`OEE de planta ${Math.round(oee)} % (objetivo ${OBJETIVO_OEE} %)`);
  if (cumplimiento !== null) detalle.push(`${cumplimiento} % del objetivo de producción de hoy`);
  detalle.push(textoBloqueantes);
  return { nivel, titulo, detalle };
}

export interface IncidenciaResumen {
  status: string;
  type: string;
}

/** Abiertas = sin resolver; bloqueantes = abiertas de mantenimiento o seguridad. */
export function contarIncidencias(incidencias: readonly IncidenciaResumen[]): { abiertas: number; bloqueantes: number } {
  const abiertas = incidencias.filter((i) => i.status === 'abierto' || i.status === 'en_progreso').length;
  const bloqueantes = incidencias.filter(
    (i) => i.status === 'abierto' && (i.type === 'mantenimiento' || i.type === 'seguridad'),
  ).length;
  return { abiertas, bloqueantes };
}
