import { describe, expect, it } from 'vitest';
import {
  datosHasta,
  duracionLegible,
  jornadaVecina,
  marcasDeHora,
  posicionAhora,
  segmentosDeTurno,
  tipoDeParte,
  type ParteLinea,
} from './live-line.js';
import { instanteMadrid, turnosDeJornada } from './planta-calendario.js';

/**
 * La pestaña pintaba barras con Math.random() y las regeneraba en cada
 * refresco; además se encogían a las dos primeras horas. Estas funciones son
 * el contrato de lo que se dibuja: segmentos reales, recortados al turno, sin
 * solapes, con el eje y el marcador de "ahora" en el mismo sistema (% del turno).
 */

const [noche, manana] = turnosDeJornada('2026-11-17'); // martes

const parte = (desde: Date, hasta: Date, extra: Partial<ParteLinea> = {}): ParteLinea => ({
  type: 'produccion',
  start_time: desde.toISOString(),
  end_time: hasta.toISOString(),
  downtime_reason: null,
  produced_quantity: 100,
  order_code: '4582',
  ...extra,
});

describe('segmentosDeTurno', () => {
  it('cubre el turno sin solapes, rellena los huecos como sin_actividad y suma el 100 %', () => {
    const t = manana;
    const h = (n: number) => new Date(t.inicio.getTime() + n * 3600000);
    const segs = segmentosDeTurno(
      [
        parte(h(0), h(2)),
        parte(h(2.5), h(3), { type: 'parada', downtime_reason: 'averia_menor', produced_quantity: 0 }),
        parte(h(3), h(8)),
      ],
      t,
      t.fin,
    );
    expect(segs.map((s) => s.tipo)).toEqual(['produccion', 'sin_actividad', 'parada', 'produccion']);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].inicio.getTime()).toBe(segs[i - 1].fin.getTime());
      expect(segs[i].izquierdaPct).toBeCloseTo(segs[i - 1].izquierdaPct + segs[i - 1].anchoPct, 6);
    }
    expect(segs[0].izquierdaPct).toBe(0);
    expect(segs.reduce((s, x) => s + x.anchoPct, 0)).toBeCloseTo(100, 6);
  });

  it('recorta los partes que salen del turno', () => {
    const t = manana;
    const segs = segmentosDeTurno(
      [parte(new Date(t.inicio.getTime() - 3600000), new Date(t.inicio.getTime() + 3600000))],
      t,
      t.fin,
    );
    expect(segs[0].inicio.getTime()).toBe(t.inicio.getTime());
    expect(segs[0].anchoPct).toBeCloseTo(12.5, 6); // 1 h de 8 h
  });

  it('no pinta nada después del último dato (el futuro queda en blanco) ni inventa un hueco al final', () => {
    const t = manana;
    const limite = new Date(t.inicio.getTime() + 3 * 3600000);
    const segs = segmentosDeTurno([parte(t.inicio, limite)], t, limite);
    expect(segs).toHaveLength(1);
    expect(segs[0].izquierdaPct + segs[0].anchoPct).toBeCloseTo(37.5, 6);
  });

  it('un puesto sin partes en un turno ya empezado es un único tramo sin_actividad', () => {
    const limite = new Date(manana.inicio.getTime() + 2 * 3600000);
    const segs = segmentosDeTurno([], manana, limite);
    expect(segs).toHaveLength(1);
    expect(segs[0].tipo).toBe('sin_actividad');
  });

  it('el turno de noche cruza medianoche y sigue ocupando el 100 % del eje', () => {
    const h = (n: number) => new Date(noche.inicio.getTime() + n * 3600000);
    const segs = segmentosDeTurno([parte(h(0), h(8))], noche, noche.fin);
    expect(segs).toHaveLength(1);
    expect(segs[0].anchoPct).toBeCloseTo(100, 6);
  });

  it('un turno que aún no ha empezado no tiene segmentos', () => {
    const limite = new Date(manana.inicio.getTime() - 1000);
    expect(segmentosDeTurno([parte(manana.inicio, manana.fin)], manana, limite)).toEqual([]);
  });
});

describe('marcador "ahora" y eje horario', () => {
  it('el marcador cae dentro del eje y usa los mismos minutos de turno que las barras', () => {
    const ahora = new Date(manana.inicio.getTime() + 2 * 3600000); // 08:00
    expect(posicionAhora(manana, ahora)).toBeCloseTo(25, 6);
  });

  it('fuera del turno no hay marcador', () => {
    expect(posicionAhora(manana, new Date(manana.fin.getTime() + 60000))).toBeNull();
    expect(posicionAhora(manana, new Date(manana.inicio.getTime() - 60000))).toBeNull();
  });

  it('las marcas de la noche van de 22:00 a 06:00 pasando por 00:00', () => {
    const marcas = marcasDeHora(noche);
    expect(marcas.map((m) => m.etiqueta)).toEqual(['22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00']);
    expect(marcas[0].pct).toBe(0);
    expect(marcas[marcas.length - 1].pct).toBe(100);
  });

  it('las marcas de la mañana van de 06:00 a 14:00', () => {
    const marcas = marcasDeHora(manana);
    expect(marcas[0].etiqueta).toBe('06:00');
    expect(marcas[marcas.length - 1].etiqueta).toBe('14:00');
  });
});

describe('utilidades', () => {
  it('clasifica los partes: cambio de formato aparte del resto de paradas', () => {
    expect(tipoDeParte({ type: 'produccion', downtime_reason: null })).toBe('produccion');
    expect(tipoDeParte({ type: 'parada', downtime_reason: 'cambio_formato' })).toBe('cambio');
    expect(tipoDeParte({ type: 'parada', downtime_reason: 'limpieza' })).toBe('parada');
  });

  it('datosHasta es el último fin de parte de toda la planta', () => {
    const a = instanteMadrid(2026, 11, 17, 8, 0);
    const b = instanteMadrid(2026, 11, 17, 9, 30);
    expect(datosHasta([[parte(a, b)], [parte(a, a)], []])?.getTime()).toBe(b.getTime());
    expect(datosHasta([[], []])).toBeNull();
  });

  it('formatea duraciones', () => {
    expect(duracionLegible(45 * 60000)).toBe('45 min');
    expect(duracionLegible(120 * 60000)).toBe('2 h');
    expect(duracionLegible(125 * 60000)).toBe('2 h 05 min');
  });
});

describe('jornadaVecina', () => {
  it('devuelve siempre una jornada con turnos, anterior o posterior según la dirección', () => {
    const atras = jornadaVecina('2026-11-16', -1, '2026-11-20');
    const delante = jornadaVecina('2026-11-13', 1, '2026-11-20');
    expect(atras).not.toBeNull();
    expect(delante).not.toBeNull();
    expect(atras! < '2026-11-16').toBe(true);
    expect(delante! > '2026-11-13').toBe(true);
    expect(turnosDeJornada(atras!).length).toBeGreaterThan(0);
    expect(turnosDeJornada(delante!).length).toBeGreaterThan(0);
  });
  it('desde el lunes retrocede por encima del domingo cerrado', () => {
    expect(jornadaVecina('2026-11-16', -1, '2026-11-20')).not.toBe('2026-11-15');
  });
  it('no pasa de la jornada en curso ni de 14 días atrás', () => {
    expect(jornadaVecina('2026-11-17', 1, '2026-11-17')).toBeNull();
    expect(jornadaVecina('2026-11-03', -1, '2026-11-17')).toBeNull();
  });
});
