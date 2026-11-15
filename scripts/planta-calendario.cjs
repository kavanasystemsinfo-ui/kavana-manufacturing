// Calendario de planta de la demo (hora de Madrid). Copia en CommonJS de
// frontend/src/utils/planta-calendario.ts: el simulador del VPS la usa para
// generar solo la actividad que el calendario permite. La prueba
// frontend/src/utils/planta-calendario.spec.ts comprueba que las dos dan lo mismo.
//
// Jornada del día D (lunes a viernes): de las 22:00 de D-1 a las 22:00 de D.
//   Noche 22:00-06:00 (pertenece al día en que termina), Mañana 06:00-14:00, Tarde 14:00-22:00.
// La semana empieza el domingo a las 22:00 y acaba el viernes a las 22:00 (sin noche de viernes).
// Sábados de refuerzo: 1 o 2 al mes, solo mañana, elegidos con una semilla del mes.

'use strict';

const ZONA = 'Europe/Madrid';

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

const ETIQUETAS = { noche: 'Noche', manana: 'Mañana', tarde: 'Tarde' };

function partesEnMadrid(instante) {
  const valores = {};
  for (const parte of FORMATEADOR.formatToParts(instante)) {
    if (parte.type !== 'literal') valores[parte.type] = Number(parte.value);
  }
  return { y: valores.year, m: valores.month, d: valores.day, h: valores.hour, mi: valores.minute };
}

function desfaseMadridMs(t) {
  const p = partesEnMadrid(new Date(t));
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, 0) - Math.floor(t / 60000) * 60000;
}

function instanteMadrid(y, m, d, h, mi = 0) {
  const aprox = Date.UTC(y, m - 1, d, h, mi);
  const primero = aprox - desfaseMadridMs(aprox);
  return new Date(aprox - desfaseMadridMs(primero));
}

function isoDe(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function desdeIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function sumarDias(iso, n) {
  const { y, m, d } = desdeIso(iso);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return isoDe(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate());
}

function diaSemana(iso) {
  const { y, m, d } = desdeIso(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isoDeInstante(instante) {
  const p = partesEnMadrid(instante);
  return isoDe(p.y, p.m, p.d);
}

function mulberry32(semilla) {
  let a = semilla | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sabadosAbiertos(y, m) {
  const sabados = [];
  const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= diasMes; d++) {
    const iso = isoDe(y, m, d);
    if (diaSemana(iso) === 6) sabados.push(iso);
  }
  const azar = mulberry32(y * 100 + m);
  const cuantos = azar() < 0.5 ? 1 : 2;
  const elegidos = [];
  const libres = [...sabados];
  while (elegidos.length < cuantos && libres.length > 0) {
    const i = Math.floor(azar() * libres.length);
    elegidos.push(libres.splice(i, 1)[0]);
  }
  return elegidos.sort();
}

function esSabadoAbierto(iso) {
  const { y, m } = desdeIso(iso);
  return diaSemana(iso) === 6 && sabadosAbiertos(y, m).includes(iso);
}

function esJornadaLaborable(iso) {
  const dia = diaSemana(iso);
  if (dia >= 1 && dia <= 5) return true;
  return esSabadoAbierto(iso);
}

function crearTurno(clave, jornada, desde, hasta) {
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

function turnosDeJornada(iso) {
  if (!esJornadaLaborable(iso)) return [];
  const dia = diaSemana(iso);
  const turnos = [];
  if (dia >= 1 && dia <= 5) turnos.push(crearTurno('noche', iso, [sumarDias(iso, -1), 22], [iso, 6]));
  turnos.push(crearTurno('manana', iso, [iso, 6], [iso, 14]));
  if (dia >= 1 && dia <= 5) turnos.push(crearTurno('tarde', iso, [iso, 14], [iso, 22]));
  return turnos;
}

function turnosAlrededor(ahora, diasAtras, diasAdelante) {
  const hoy = isoDeInstante(ahora);
  const todos = [];
  for (let n = -diasAtras; n <= diasAdelante; n++) todos.push(...turnosDeJornada(sumarDias(hoy, n)));
  return todos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

function turnoActual(ahora) {
  const t = ahora.getTime();
  return turnosAlrededor(ahora, 1, 1).find((x) => x.inicio.getTime() <= t && t < x.fin.getTime()) || null;
}

function plantaAbierta(ahora) {
  return turnoActual(ahora) !== null;
}

/**
 * Jornada que toca simular ahora: la última cuyo primer turno ya empezó. Se
 * sigue regenerando hasta 90 minutos después de acabar, para dejarla completa.
 * Devuelve null con la planta cerrada y la jornada anterior ya cerrada del todo.
 */
function jornadaASimular(ahora) {
  const t = ahora.getTime();
  const iniciadas = turnosAlrededor(ahora, 3, 1).filter((x) => x.inicio.getTime() <= t);
  if (iniciadas.length === 0) return null;
  const ultima = iniciadas[iniciadas.length - 1].jornada;
  const turnos = turnosDeJornada(ultima);
  const fin = turnos[turnos.length - 1].fin.getTime();
  if (t >= fin + 90 * 60000) return null;
  return { jornada: ultima, turnos };
}

module.exports = {
  ZONA,
  partesEnMadrid,
  instanteMadrid,
  isoDe,
  sumarDias,
  diaSemana,
  isoDeInstante,
  sabadosAbiertos,
  esSabadoAbierto,
  esJornadaLaborable,
  turnosDeJornada,
  turnoActual,
  plantaAbierta,
  jornadaASimular,
};
