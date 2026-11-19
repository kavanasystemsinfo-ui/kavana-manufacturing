import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  ventanaDeHoy,
  ventanaDeTurno,
  instanteMadrid,
  isoDeInstante,
  plantaAbierta,
  proximaApertura,
  sabadosAbiertos,
  sumarDias,
  turnoActual,
  turnosDeJornada,
  ultimoTurno,
} from './planta-calendario.js';

/**
 * Calendario de planta: la jornada de cada día laborable va de las 22:00 de la
 * víspera a las 22:00 del propio día, en tres turnos contiguos; la semana
 * arranca el domingo a las 22:00 y acaba el viernes a las 22:00; y 1 o 2
 * sábados al mes se trabaja solo la mañana. Todo en hora de Madrid.
 */

const hm = (d: Date) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);

describe('turnosDeJornada', () => {
  it('un lunes tiene tres turnos contiguos de 22:00 (domingo) a 22:00 (lunes)', () => {
    const turnos = turnosDeJornada('2026-11-16'); // lunes
    expect(turnos.map((t) => t.clave)).toEqual(['noche', 'manana', 'tarde']);
    expect(hm(turnos[0].inicio)).toContain('22:00');
    expect(isoDeInstante(turnos[0].inicio)).toBe('2026-11-15'); // domingo
    expect(hm(turnos[2].fin)).toContain('22:00');
    expect(isoDeInstante(turnos[2].fin)).toBe('2026-11-16');
    for (let i = 1; i < turnos.length; i++) {
      expect(turnos[i].inicio.getTime()).toBe(turnos[i - 1].fin.getTime());
    }
  });

  it('el turno de noche cruza medianoche y dura 8 horas', () => {
    const [noche] = turnosDeJornada('2026-11-17');
    expect(isoDeInstante(noche.inicio)).toBe('2026-11-16');
    expect(isoDeInstante(new Date(noche.fin.getTime() - 1))).toBe('2026-11-17');
    expect(noche.fin.getTime() - noche.inicio.getTime()).toBe(8 * 3600 * 1000);
  });

  it('todos los turnos duran 8 horas durante un año, incluidos los cambios de hora', () => {
    let dia = '2026-01-01';
    for (let i = 0; i < 365; i++) {
      for (const t of turnosDeJornada(dia)) {
        expect(t.fin.getTime() - t.inicio.getTime(), `${dia} ${t.clave}`).toBe(8 * 3600 * 1000);
      }
      dia = sumarDias(dia, 1);
    }
  });

  it('el viernes acaba a las 22:00 y no hay noche de viernes (la noche del sábado no existe)', () => {
    const viernes = turnosDeJornada('2026-11-13');
    expect(hm(viernes[viernes.length - 1].fin)).toContain('22:00');
    const sabado = turnosDeJornada('2026-11-14');
    expect(sabado.every((t) => t.clave !== 'noche' && t.clave !== 'tarde')).toBe(true);
  });

  it('un domingo no tiene jornada propia (la noche de las 22:00 es del lunes)', () => {
    expect(turnosDeJornada('2026-11-15')).toEqual([]);
  });

  it('un sábado abierto solo tiene la mañana, de 06:00 a 14:00', () => {
    const abierto = sabadosAbiertos(2026, 11)[0];
    const turnos = turnosDeJornada(abierto);
    expect(turnos.map((t) => t.clave)).toEqual(['manana']);
    expect(hm(turnos[0].inicio)).toContain('06:00');
    expect(hm(turnos[0].fin)).toContain('14:00');
  });
});

describe('sabadosAbiertos', () => {
  it('cada mes abre entre 1 y 2 sábados, siempre los mismos', () => {
    for (let año = 2026; año <= 2027; año++) {
      for (let mes = 1; mes <= 12; mes++) {
        const a = sabadosAbiertos(año, mes);
        expect(a.length).toBeGreaterThanOrEqual(1);
        expect(a.length).toBeLessThanOrEqual(2);
        expect(sabadosAbiertos(año, mes)).toEqual(a);
        expect(new Set(a).size).toBe(a.length);
      }
    }
  });
});

describe('turnoActual y planta cerrada', () => {
  it('domingo a las 20:00 la planta está cerrada y reabre a las 22:00', () => {
    const ahora = instanteMadrid(2026, 11, 15, 20, 0);
    expect(turnoActual(ahora)).toBeNull();
    expect(plantaAbierta(ahora)).toBe(false);
    expect(proximaApertura(ahora)?.getTime()).toBe(instanteMadrid(2026, 11, 15, 22, 0).getTime());
  });

  it('con el sábado cerrado, el último turno trabajado es la tarde del viernes', () => {
    // primer domingo de 2026 cuyo sábado anterior no es de refuerzo
    let domingo = '2026-11-01';
    while (turnosDeJornada(sumarDias(domingo, -1)).length > 0) domingo = sumarDias(domingo, 7);
    const [a, m, d] = domingo.split('-').map(Number);
    const ultimo = ultimoTurno(instanteMadrid(a, m, d, 20, 0));
    expect(ultimo?.clave).toBe('tarde');
    expect(ultimo?.jornada).toBe(sumarDias(domingo, -2)); // el viernes
  });

  it('con el sábado de refuerzo, el último turno trabajado es su mañana', () => {
    const sabado = sabadosAbiertos(2026, 11)[0];
    const domingo = sumarDias(sabado, 1);
    const [a, m, d] = domingo.split('-').map(Number);
    const ultimo = ultimoTurno(instanteMadrid(a, m, d, 20, 0));
    expect(ultimo?.clave).toBe('manana');
    expect(ultimo?.jornada).toBe(sabado);
  });

  it('domingo a las 23:00 corre la noche del lunes', () => {
    const t = turnoActual(instanteMadrid(2026, 11, 15, 23, 0));
    expect(t?.clave).toBe('noche');
    expect(t?.jornada).toBe('2026-11-16');
  });

  it('martes a las 02:00 sigue la noche del martes, que empezó el lunes a las 22:00', () => {
    const t = turnoActual(instanteMadrid(2026, 11, 17, 2, 0));
    expect(t?.clave).toBe('noche');
    expect(t?.jornada).toBe('2026-11-17');
  });

  it('viernes a las 22:30 y todo el sábado cerrado (salvo sábado abierto)', () => {
    expect(plantaAbierta(instanteMadrid(2026, 11, 13, 22, 30))).toBe(false);
    expect(plantaAbierta(instanteMadrid(2026, 11, 14, 3, 0))).toBe(false);
    const abierto = sabadosAbiertos(2026, 11)[0];
    const [a, m, d] = abierto.split('-').map(Number);
    expect(plantaAbierta(instanteMadrid(a, m, d, 9, 0))).toBe(true);
    expect(plantaAbierta(instanteMadrid(a, m, d, 15, 0))).toBe(false);
  });
});

describe('copia del simulador (scripts/planta-calendario.cjs)', () => {
  const require = createRequire(import.meta.url);
  const cjs = require('../../../scripts/planta-calendario.cjs');

  it('da los mismos sábados y los mismos turnos que la versión de la pantalla', () => {
    for (let mes = 1; mes <= 12; mes++) {
      expect(cjs.sabadosAbiertos(2026, mes)).toEqual(sabadosAbiertos(2026, mes));
    }
    let dia = '2026-01-01';
    for (let i = 0; i < 365; i++) {
      const a = turnosDeJornada(dia).map((t) => [t.clave, t.inicio.toISOString(), t.fin.toISOString()]);
      const b = cjs.turnosDeJornada(dia).map((t: { clave: string; inicio: Date; fin: Date }) => [t.clave, t.inicio.toISOString(), t.fin.toISOString()]);
      expect(b, dia).toEqual(a);
      dia = sumarDias(dia, 1);
    }
  });

  it('jornadaASimular: nada con la planta cerrada, la jornada del lunes desde el domingo a las 22:00', () => {
    expect(cjs.jornadaASimular(instanteMadrid(2026, 11, 15, 20, 30))).toBeNull();
    expect(cjs.jornadaASimular(instanteMadrid(2026, 11, 15, 22, 5))?.jornada).toBe('2026-11-16');
    expect(cjs.jornadaASimular(instanteMadrid(2026, 11, 17, 2, 5))?.jornada).toBe('2026-11-17');
    // 22:05 del viernes: aún se deja completa la jornada; a las 23:45 ya no
    expect(cjs.jornadaASimular(instanteMadrid(2026, 11, 13, 22, 5))?.jornada).toBe('2026-11-13');
    expect(cjs.jornadaASimular(instanteMadrid(2026, 11, 13, 23, 45))).toBeNull();
  });
});

describe('ventanaDeHoy', () => {
  it('un lunes a media tarde la jornada empieza el domingo a las 22:00', () => {
    const v = ventanaDeHoy(instanteMadrid(2026, 11, 16, 14, 51));
    expect(v.inicio.getTime()).toBe(instanteMadrid(2026, 11, 15, 22, 0).getTime());
    expect(v.fin.getTime()).toBe(instanteMadrid(2026, 11, 16, 22, 0).getTime());
  });

  it('el domingo a las 23:00 ya cuenta como la jornada del lunes', () => {
    const v = ventanaDeHoy(instanteMadrid(2026, 11, 22, 23, 0));
    expect(v.inicio.getTime()).toBe(instanteMadrid(2026, 11, 22, 22, 0).getTime());
    expect(v.fin.getTime()).toBe(instanteMadrid(2026, 11, 23, 22, 0).getTime());
  });
});

describe('ventanaDeTurno (cierre e indicadores del operario)', () => {
  it('en plena noche (03:00) la ventana es 22:00 de ayer a 06:00 de hoy', () => {
    // 2026-11-17 es martes: la noche del martes empezó el lunes a las 22:00
    const v = ventanaDeTurno(instanteMadrid(2026, 11, 17, 3, 0));
    expect(v.inicio.getTime()).toBe(instanteMadrid(2026, 11, 16, 22, 0).getTime());
    expect(v.fin.getTime()).toBe(instanteMadrid(2026, 11, 17, 6, 0).getTime());
    expect(v.clave).toBe('noche');
  });

  it('a las 23:00 la ventana es la noche que acaba a las 06:00', () => {
    // 2026-11-16 es lunes: su noche empezó el domingo 15 a las 22:00
    const v = ventanaDeTurno(instanteMadrid(2026, 11, 16, 23, 0)); // lunes 23:00
    expect(v.inicio.getTime()).toBe(instanteMadrid(2026, 11, 16, 22, 0).getTime());
    expect(v.fin.getTime()).toBe(instanteMadrid(2026, 11, 17, 6, 0).getTime());
    expect(v.clave).toBe('noche');
  });

  it('en el turno de mañana la ventana es 06:00-14:00 del mismo día', () => {
    const v = ventanaDeTurno(instanteMadrid(2026, 11, 16, 9, 30));
    expect(v.inicio.getTime()).toBe(instanteMadrid(2026, 11, 16, 6, 0).getTime());
    expect(v.fin.getTime()).toBe(instanteMadrid(2026, 11, 16, 14, 0).getTime());
    expect(v.clave).toBe('manana');
  });

  it('en el turno de tarde la ventana es 14:00-22:00 del mismo día', () => {
    const v = ventanaDeTurno(instanteMadrid(2026, 11, 16, 18, 0));
    expect(v.inicio.getTime()).toBe(instanteMadrid(2026, 11, 16, 14, 0).getTime());
    expect(v.fin.getTime()).toBe(instanteMadrid(2026, 11, 16, 22, 0).getTime());
    expect(v.clave).toBe('tarde');
  });

  it('con la planta cerrada usa el último turno terminado', () => {
    // 2026-11-14 es sábado de refuerzo (solo mañana); el domingo 15 la planta está
    // cerrada, así que el último turno terminado es la mañana del sábado 14
    const v = ventanaDeTurno(instanteMadrid(2026, 11, 15, 20, 0)); // domingo 20:00, planta cerrada
    expect(v.inicio.getTime()).toBe(instanteMadrid(2026, 11, 14, 6, 0).getTime());
    expect(v.fin.getTime()).toBe(instanteMadrid(2026, 11, 14, 14, 0).getTime());
    expect(v.clave).toBe('manana');
  });
});
