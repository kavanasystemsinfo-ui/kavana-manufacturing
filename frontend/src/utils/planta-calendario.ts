/**
 * Calendario de planta de la demo (hora de Madrid).
 *
 * La jornada del día D (lunes a viernes) va de las 22:00 de D-1 a las 22:00 de
 * D, en tres turnos contiguos:
 *   - Noche   22:00-06:00 (pertenece al día en que TERMINA: la noche del lunes
 *             es de domingo 22:00 a lunes 06:00)
 *   - Mañana  06:00-14:00
 *   - Tarde   14:00-22:00
 * La semana empieza el domingo a las 22:00 y acaba el viernes a las 22:00. No
 * hay noche del viernes. Algunos sábados (1 o 2 al mes, elegidos con una
 * semilla del mes, siempre los mismos) se trabaja solo la mañana.
 *
 * El simulador del VPS (scripts/planta-calendario.cjs) tiene una copia de esta
 * lógica; planta-calendario.spec.ts comprueba que las dos dan lo mismo.
 */

export const ZONA = 'Europe/Madrid';

export type TurnoClave = 'noche' | 'manana' | 'tarde';

export interface Turno {
  clave: TurnoClave;
  etiqueta: string;
  inicio: Date;
  fin: Date;
  /** Día laborable (YYYY-MM-DD, Madrid) al que pertenece el turno. */
  jornada: string;
}

const ETIQUETAS: Record<TurnoClave, string> = {
  noche: 'Noche',
  manana: 'Mañana',
  tarde: 'Tarde',
};

const FORMATEADOR = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

export interface PartesMadrid {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
}

export function partesEnMadrid(instante: Date): PartesMadrid {
  const valores: Record<string, number> = {};
  for (const parte of FORMATEADOR.formatToParts(instante)) {
    if (parte.type !== 'literal') valores[parte.type] = Number(parte.value);
  }
  return { y: valores.year, m: valores.month, d: valores.day, h: valores.hour, mi: valores.minute };
}

function desfaseMadridMs(t: number): number {
  const p = partesEnMadrid(new Date(t));
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, 0) - Math.floor(t / 60000) * 60000;
}

/** Instante UTC que corresponde a una hora de reloj de Madrid. */
export function instanteMadrid(y: number, m: number, d: number, h: number, mi = 0): Date {
  const aprox = Date.UTC(y, m - 1, d, h, mi);
  const primero = aprox - desfaseMadridMs(aprox);
  return new Date(aprox - desfaseMadridMs(primero));
}

export function isoDe(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function desdeIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function sumarDias(iso: string, n: number): string {
  const { y, m, d } = desdeIso(iso);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return isoDe(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate());
}

/** 0 = domingo ... 6 = sábado. */
export function diaSemana(iso: string): number {
  const { y, m, d } = desdeIso(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isoDeInstante(instante: Date): string {
  const p = partesEnMadrid(instante);
  return isoDe(p.y, p.m, p.d);
}

function mulberry32(semilla: number): () => number {
  let a = semilla | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sábados de refuerzo del mes (1 o 2), siempre los mismos para un mes dado. */
export function sabadosAbiertos(y: number, m: number): string[] {
  const sabados: string[] = [];
  const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= diasMes; d++) {
    const iso = isoDe(y, m, d);
    if (diaSemana(iso) === 6) sabados.push(iso);
  }
  const azar = mulberry32(y * 100 + m);
  const cuantos = azar() < 0.5 ? 1 : 2;
  const elegidos: string[] = [];
  const libres = [...sabados];
  while (elegidos.length < cuantos && libres.length > 0) {
    const i = Math.floor(azar() * libres.length);
    elegidos.push(libres.splice(i, 1)[0]);
  }
  return elegidos.sort();
}

export function esSabadoAbierto(iso: string): boolean {
  const { y, m } = desdeIso(iso);
  return diaSemana(iso) === 6 && sabadosAbiertos(y, m).includes(iso);
}

export function esJornadaLaborable(iso: string): boolean {
  const dia = diaSemana(iso);
  if (dia >= 1 && dia <= 5) return true;
  return esSabadoAbierto(iso);
}

function crearTurno(clave: TurnoClave, jornada: string, desde: [string, number], hasta: [string, number]): Turno {
  const a = desdeIso(desde[0]);
  const b = desdeIso(hasta[0]);
  return {
    clave,
    etiqueta: ETIQUETAS[clave],
    inicio: instanteMadrid(a.y, a.m, a.d, desde[1]),
    fin: instanteMadrid(b.y, b.m, b.d, hasta[1]),
    jornada,
  };
}

/** Turnos de una jornada, en orden cronológico. Vacío si la planta no trabaja ese día. */
export function turnosDeJornada(iso: string): Turno[] {
  if (!esJornadaLaborable(iso)) return [];
  const dia = diaSemana(iso);
  const turnos: Turno[] = [];
  if (dia >= 1 && dia <= 5) {
    turnos.push(crearTurno('noche', iso, [sumarDias(iso, -1), 22], [iso, 6]));
  }
  turnos.push(crearTurno('manana', iso, [iso, 6], [iso, 14]));
  if (dia >= 1 && dia <= 5) {
    turnos.push(crearTurno('tarde', iso, [iso, 14], [iso, 22]));
  }
  return turnos;
}

function turnosAlrededor(ahora: Date, diasAtras: number, diasAdelante: number): Turno[] {
  const hoy = isoDeInstante(ahora);
  const todos: Turno[] = [];
  for (let n = -diasAtras; n <= diasAdelante; n++) {
    todos.push(...turnosDeJornada(sumarDias(hoy, n)));
  }
  return todos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/** Turno que está en marcha en este instante, o null si la planta está parada. */
export function turnoActual(ahora: Date): Turno | null {
  const t = ahora.getTime();
  return turnosAlrededor(ahora, 1, 1).find((x) => x.inicio.getTime() <= t && t < x.fin.getTime()) ?? null;
}

export function plantaAbierta(ahora: Date): boolean {
  return turnoActual(ahora) !== null;
}

/** Último turno ya terminado (para enseñar algo cuando la planta está cerrada). */
export function ultimoTurno(ahora: Date): Turno | null {
  const t = ahora.getTime();
  const pasados = turnosAlrededor(ahora, 10, 0).filter((x) => x.fin.getTime() <= t);
  return pasados.length > 0 ? pasados[pasados.length - 1] : null;
}

/** Inicio del próximo turno, para decir cuándo reabre la planta. */
export function proximaApertura(ahora: Date): Date | null {
  const t = ahora.getTime();
  const futuros = turnosAlrededor(ahora, 0, 10).filter((x) => x.inicio.getTime() > t);
  return futuros.length > 0 ? futuros[0].inicio : null;
}

/**
 * Jornada que cuenta como "hoy" para los resúmenes: la del turno en marcha o,
 * con la planta cerrada, la del último turno terminado. Empieza con su primer
 * turno (el lunes, el domingo a las 22:00), no a las 00:00 del día natural.
 */
export function ventanaDeHoy(ahora: Date): { inicio: Date; fin: Date } {
  const referencia = turnoActual(ahora) ?? ultimoTurno(ahora);
  if (!referencia) {
    const inicio = new Date(ahora);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fin: ahora };
  }
  const turnos = turnosDeJornada(referencia.jornada);
  return { inicio: turnos[0].inicio, fin: turnos[turnos.length - 1].fin };
}

/**
 * Ventana del TURNO en curso (no de la jornada): la que usan el cierre de
 * turno y los indicadores del operario, para que un turno de noche
 * (22:00-06:00) se vea entero aunque cruce la medianoche. Con la planta
 * cerrada devuelve el último turno terminado.
 */
export function ventanaDeTurno(ahora: Date): { inicio: Date; fin: Date; clave: TurnoClave } {
  const t = turnoActual(ahora) ?? ultimoTurno(ahora);
  if (!t) {
    const inicio = new Date(ahora);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fin: ahora, clave: 'tarde' };
  }
  return { inicio: t.inicio, fin: t.fin, clave: t.clave };
}
