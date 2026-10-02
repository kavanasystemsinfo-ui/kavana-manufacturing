import { describe, expect, it } from 'vitest';
import { calcularOee, resumirBloques, type BloqueDeTrabajo } from './oee.calculo.js';

/**
 * El OEE es la cifra que justifica comprar un MES, así que tiene que poder
 * reproducirse a mano con los partes delante. Estas pruebas fijan los números
 * de un ejemplo real y el comportamiento en los bordes, para que el panel y el
 * recálculo no puedan volver a dar cosas distintas.
 */

const JORNADA: BloqueDeTrabajo[] = [
  {
    type: 'produccion',
    start_time: '2026-07-04T08:00:00.000Z',
    end_time: '2026-07-04T12:00:00.000Z', // 4 horas
    produced_quantity: 800,
    defect_quantity: 20,
  },
  {
    type: 'parada',
    start_time: '2026-07-04T12:00:00.000Z',
    end_time: '2026-07-04T13:00:00.000Z', // 1 hora
    produced_quantity: 0,
    defect_quantity: 0,
  },
];

describe('Resumen de los partes', () => {
  it('separa tiempo de producción, tiempo parado y piezas', () => {
    const r = resumirBloques(JORNADA);
    expect(r.produccionMs).toBe(4 * 3600 * 1000);
    expect(r.paradaMs).toBe(1 * 3600 * 1000);
    expect(r.producidas).toBe(800);
    expect(r.defectuosas).toBe(20);
  });

  it('los tipos desconocidos no se cuelan como producción', () => {
    const r = resumirBloques([
      { type: 'otra_cosa', start_time: '2026-07-04T08:00:00.000Z', end_time: '2026-07-04T09:00:00.000Z' },
    ]);
    expect(r.produccionMs).toBe(0);
    expect(r.paradaMs).toBe(0);
  });
});

describe('Cálculo del OEE', () => {
  it('da los números que un jefe de planta puede rehacer a mano', () => {
    const r = calcularOee({ bloques: JORNADA, targetRate: 250 });

    // 4 h produciendo de 5 h registradas
    expect(r.availability).toBe(80);
    // 800 piezas en 4 h son 200 por hora, frente a un objetivo de 250
    expect(r.performance).toBe(80);
    // (800 - 20) / 800
    expect(r.quality).toBe(97.5);
    // 0,8 × 0,8 × 0,975 = 62,4 %
    expect(r.oee).toBeCloseTo(62.4, 1);
  });

  it('sin objetivo conocido el rendimiento no se inventa', () => {
    const r = calcularOee({ bloques: JORNADA, targetRate: 0 });
    expect(r.performance).toBe(0);
    expect(r.oee).toBe(0);
    // Lo que sí se sabe se sigue publicando.
    expect(r.availability).toBe(80);
    expect(r.quality).toBe(97.5);
  });

  it('el rendimiento nunca pasa del cien por cien', () => {
    // 800 piezas en 4 h con un objetivo de 100 por hora sería el doble: se corta.
    const r = calcularOee({ bloques: JORNADA, targetRate: 100 });
    expect(r.performance).toBe(100);
  });

  it('sin partes no se inventa disponibilidad', () => {
    const r = calcularOee({ bloques: [], targetRate: 250 });
    expect(r.availability).toBe(0);
    expect(r.performance).toBe(0);
    expect(r.quality).toBe(0);
    expect(r.oee).toBe(0);
  });

  it('una parada sin motivo sigue contando como tiempo parado', () => {
    const r = calcularOee({
      bloques: [
        ...JORNADA,
        {
          type: 'parada',
          start_time: '2026-07-04T14:00:00.000Z',
          end_time: '2026-07-04T15:00:00.000Z',
          downtime_reason: null,
        },
      ],
      targetRate: 250,
    });
    // 4 h produciendo de 6 h registradas
    expect(r.availability).toBeCloseTo(66.67, 1);
  });

  it('si toda la jornada fue parada, el OEE es cero y no un cien por cien', () => {
    const r = calcularOee({
      bloques: [{ type: 'parada', start_time: '2026-07-04T08:00:00.000Z', end_time: '2026-07-04T16:00:00.000Z' }],
      targetRate: 250,
    });
    expect(r.availability).toBe(0);
    expect(r.oee).toBe(0);
  });

  it('los defectos no pueden dejar la calidad por debajo de cero', () => {
    const r = calcularOee({
      bloques: [
        {
          type: 'produccion',
          start_time: '2026-07-04T08:00:00.000Z',
          end_time: '2026-07-04T09:00:00.000Z',
          produced_quantity: 10,
          defect_quantity: 25, // el esquema lo permite hoy: no debe dar calidad negativa
        },
      ],
      targetRate: 250,
    });
    expect(r.quality).toBe(0);
  });
});
