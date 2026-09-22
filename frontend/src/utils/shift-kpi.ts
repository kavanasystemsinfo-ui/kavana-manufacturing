export interface ShiftBlock {
  type: 'produccion' | 'parada';
  start_time: string;
  end_time: string;
  produced_quantity?: number | null;
  defect_quantity?: number | null;
  downtime_reason?: string | null;
}

export interface ShiftKPI {
  horasNetas: number;
  horasProduccion: number;
  horasParada: number;
  buenas: number;
  defectos: number;
  calidad: number;
  oeePersonal: number;
}

function hoursBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

/**
 * KPI del turno para el propio operario.
 * OEE personal = disponibilidad * rendimiento * calidad, donde la
 * disponibilidad se mide sobre el tiempo total declarado (producción +
 * parada) y el rendimiento sobre las piezas buenas por hora de producción.
 * La referencia de rendimiento es el ritmo declarado por el operario
 * (piezas producidas / hora), de modo que el indicador mide su propia
 * consistencia, no una norma externa que el panel no conoce.
 */
export function calculateShiftKPI(blocks: ShiftBlock[]): ShiftKPI {
  let horasProduccion = 0;
  let horasParada = 0;
  let buenas = 0;
  let defectos = 0;

  for (const block of blocks ?? []) {
    const horas = hoursBetween(block.start_time, block.end_time);
    if (block.type === 'produccion') {
      horasProduccion += horas;
      buenas += Number(block.produced_quantity ?? 0) || 0;
      defectos += Number(block.defect_quantity ?? 0) || 0;
    } else if (block.type === 'parada') {
      horasParada += horas;
    }
  }

  const horasNetas = horasProduccion + horasParada;
  const totalPiezas = buenas + defectos;
  const calidad = totalPiezas > 0 ? buenas / totalPiezas : 1;
  const disponibilidad = horasNetas > 0 ? horasProduccion / horasNetas : 0;
  const rendimiento = horasProduccion > 0 ? buenas / horasProduccion : 0;

  const oeePersonal = Math.round(disponibilidad * calidad * Math.min(1, rendimiento) * 100);

  return {
    horasNetas: Math.round(horasNetas * 100) / 100,
    horasProduccion: Math.round(horasProduccion * 100) / 100,
    horasParada: Math.round(horasParada * 100) / 100,
    buenas,
    defectos,
    calidad: Math.round(calidad * 100),
    oeePersonal: Math.min(100, Math.max(0, oeePersonal)),
  };
}
