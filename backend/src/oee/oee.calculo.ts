/**
 * La fórmula del OEE, en un solo sitio.
 *
 * Estaba escrita dos veces y las dos versiones no coincidían: el panel la
 * calculaba en vivo y el recálculo de cola escribía un rendimiento fijo de
 * 0,85. Dos pantallas dando números distintos del mismo puesto es peor que no
 * tener el indicador, así que ahora hay una única función y los dos caminos la
 * usan.
 *
 * Las tres partes, como se explican en planta:
 * - Disponibilidad: de todo el tiempo registrado, cuánto se estuvo produciendo.
 *   Una parada que nadie apunta no existe, y eso se ve aquí.
 * - Rendimiento: piezas por hora frente al objetivo del modelo. Sin objetivo
 *   conocido es cero, no un valor inventado.
 * - Calidad: piezas buenas sobre piezas producidas.
 */

export interface BloqueDeTrabajo {
  type: string;
  start_time: string | Date;
  end_time: string | Date;
  produced_quantity?: number | string | null;
  defect_quantity?: number | string | null;
  downtime_reason?: string | null;
}

export interface ResumenDePartes {
  produccionMs: number;
  paradaMs: number;
  producidas: number;
  defectuosas: number;
}

export interface OeeCalculado {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

const HORA_MS = 3600 * 1000;

const redondear = (valor: number): number => Math.round(valor * 100) / 100;

function duracionMs(bloque: BloqueDeTrabajo): number {
  const duracion = new Date(bloque.end_time).getTime() - new Date(bloque.start_time).getTime();
  // Un parte con fechas al revés o ilegibles no puede sumar tiempo.
  return Number.isFinite(duracion) && duracion > 0 ? duracion : 0;
}

export function resumirBloques(bloques: BloqueDeTrabajo[]): ResumenDePartes {
  let produccionMs = 0;
  let paradaMs = 0;
  let producidas = 0;
  let defectuosas = 0;

  for (const bloque of bloques) {
    const duracion = duracionMs(bloque);
    if (bloque.type === 'produccion') {
      produccionMs += duracion;
      producidas += Number(bloque.produced_quantity ?? 0);
      defectuosas += Number(bloque.defect_quantity ?? 0);
    } else if (bloque.type === 'parada') {
      paradaMs += duracion;
    }
  }

  return { produccionMs, paradaMs, producidas, defectuosas };
}

export function calcularOee(input: {
  bloques: BloqueDeTrabajo[];
  targetRate: number;
}): OeeCalculado {
  const resumen = resumirBloques(input.bloques);

  const tiempoRegistradoMs = resumen.produccionMs + resumen.paradaMs;
  const availability =
    tiempoRegistradoMs > 0 ? (resumen.produccionMs / tiempoRegistradoMs) * 100 : 0;

  const piezasPorHora =
    resumen.produccionMs > 0 ? resumen.producidas / (resumen.produccionMs / HORA_MS) : 0;
  const performance =
    input.targetRate > 0 ? Math.min((piezasPorHora / input.targetRate) * 100, 100) : 0;

  const quality =
    resumen.producidas > 0
      ? Math.max(((resumen.producidas - resumen.defectuosas) / resumen.producidas) * 100, 0)
      : 0;

  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

  return {
    availability: redondear(availability),
    performance: redondear(performance),
    quality: redondear(quality),
    oee: redondear(oee),
  };
}
