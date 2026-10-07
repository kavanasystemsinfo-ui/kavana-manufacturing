import { describe, expect, it } from 'vitest';
import { aPuntosTendencia, escalaX, puntosDeLinea, rankingDesde } from './oee-tab.js';
import type { OeeWorkstation } from '../api/analytics.js';

/**
 * OEE Avanzado pintaba ranking y tendencia con Math.random: marcaba a
 * Perfiladora con 73 % cuando la real era 98,7 %. Estas funciones son el
 * contrato de traducción de los endpoints reales a lo que dibuja la pestaña:
 * sin ceros inventados (un puesto sin partes es "sin datos", no un 0) y con
 * los porcentajes del backend (0-100) convertidos a fracción (0-1) como
 * espera el SVG.
 */

describe('aPuntosTendencia', () => {
  it('convierte los porcentajes del backend (0-100) a fraccion (0-1)', () => {
    const puntos = aPuntosTendencia([
      { date: '2026-10-07', availability: 80, performance: 90, quality: 97.5, oee: 70.2 },
    ]);

    expect(puntos).toHaveLength(1);
    expect(puntos[0].date).toBe('2026-10-07');
    expect(puntos[0].availability).toBe(0.8);
    expect(puntos[0].performance).toBe(0.9);
    expect(puntos[0].quality).toBe(0.975);
    expect(puntos[0].oee).toBeCloseTo(0.702, 6);
  });

  it('una cadena basura del endpoint no se convierte en NaN', () => {
    const puntos = aPuntosTendencia([
      { date: '2026-10-07', availability: 'x' as unknown as number, performance: null as unknown as number, quality: 0, oee: undefined as unknown as number },
    ]);

    expect(puntos[0].availability).toBe(0);
    expect(puntos[0].performance).toBe(0);
    expect(puntos[0].oee).toBe(0);
  });

  it('devuelve la serie en el mismo orden', () => {
    const fechas = ['2026-10-05', '2026-10-06', '2026-10-07'];
    const puntos = aPuntosTendencia(
      fechas.map((date) => ({ date, availability: 50, performance: 50, quality: 50, oee: 50 })),
    );

    expect(puntos.map((p) => p.date)).toEqual(fechas);
  });
});

describe('rankingDesde', () => {
  const puesto = (
    id: string,
    name: string,
    oee: number,
    extra: Partial<OeeWorkstation> = {},
  ): OeeWorkstation => ({
    workstation_id: id,
    workstation_name: name,
    oee,
    availability: oee,
    performance: oee,
    quality: oee,
    ...extra,
  });

  const estaciones = [
    { id: 'a', name: 'Prensa 1', code: 'prensa-1' },
    { id: 'b', name: 'Plegadora 1', code: 'plegadora-1' },
    { id: 'c', name: 'Perfiladora 1', code: 'perfiladora-1' },
  ];

  it('ordena de peor a mejor con los valores reales del endpoint', () => {
    const filas = rankingDesde(
      [puesto('a', 'Prensa 1', 80.18), puesto('b', 'Plegadora 1', 73.4), puesto('c', 'Perfiladora 1', 98.74)],
      estaciones,
    );

    expect(filas.map((f) => f.name)).toEqual(['Plegadora 1', 'Prensa 1', 'Perfiladora 1']);
    expect(filas[0].oee).toBeCloseTo(0.734, 3);
  });

  it('un puesto sin partes es null (sin datos), no un cero de mentira', () => {
    const filas = rankingDesde(
      [puesto('a', 'Prensa 1', 80, { sin_datos: true }), puesto('b', 'Plegadora 1', 73.4)],
      estaciones,
    );

    const sinDatos = filas.find((f) => f.id === 'a');
    expect(sinDatos?.oee).toBeNull();
    expect(sinDatos?.availability).toBeNull();
    // Al final: un cero sin partes no es "el peor puesto".
    expect(filas[filas.length - 1].id).toBe('a');
  });

  it('cruza el codigo del puesto desde las estaciones y usa guion si no hay', () => {
    const filas = rankingDesde([puesto('a', 'Prensa 1', 50), puesto('z', 'Fantasma', 40)], estaciones);

    expect(filas.find((f) => f.id === 'a')?.code).toBe('prensa-1');
    expect(filas.find((f) => f.id === 'z')?.code).toBe('—');
  });
});

describe('escalaX', () => {
  it('mapea la primera fecha a 0 y la ultima a 100 (eje proporcional al tiempo)', () => {
    const serie = aPuntosTendencia([
      { date: '2026-10-06T06:00:00Z', availability: 50, performance: 50, quality: 50, oee: 50 },
      { date: '2026-10-06T10:00:00Z', availability: 50, performance: 50, quality: 50, oee: 50 },
      { date: '2026-10-06T14:00:00Z', availability: 50, performance: 50, quality: 50, oee: 50 },
    ]);
    const x = escalaX(serie);

    expect(x(serie[0].date)).toBeCloseTo(0, 5);
    expect(x(serie[1].date)).toBeCloseTo(50, 5);
    expect(x(serie[2].date)).toBeCloseTo(100, 5);
  });
});

describe('puntosDeLinea', () => {
  const punto = (date: string, oee: number) => ({ date, availability: oee, performance: oee, quality: oee, oee });

  it('devuelve un solo segmento cuando las horas son consecutivas', () => {
    const serie = [
      punto('2026-10-07T08:00:00Z', 0.8),
      punto('2026-10-07T09:00:00Z', 0.9),
      punto('2026-10-07T10:00:00Z', 1),
    ];

    const lineas = puntosDeLinea(serie, 'oee', 3_600_000);

    expect(lineas).toHaveLength(1);
    expect(lineas[0].split(' ')).toEqual(['0.00,20.00', '50.00,10.00', '100.00,0.00']);
  });

  it('corta la linea cuando hay un hueco (la serie horaria salta horas sin bloques)', () => {
    const serie = [
      punto('2026-10-06T16:00:00Z', 0.7),
      punto('2026-10-06T17:00:00Z', 0.8),
      punto('2026-10-07T08:00:00Z', 0.9),
      punto('2026-10-07T09:00:00Z', 1),
    ];

    const lineas = puntosDeLinea(serie, 'oee', 3_600_000);

    expect(lineas).toHaveLength(2);
    expect(lineas[0].split(' ')).toHaveLength(2);
    expect(lineas[1].split(' ')).toHaveLength(2);
    // El segundo arranca en ~94 % del ancho: la escala respeta el tiempo real
    // (16 h de 17 h de ventana), no el indice de la muestra.
    expect(lineas[1].startsWith('94.12,10.00')).toBe(true);
  });

  it('una serie de un solo punto no genera polyline (evita division por cero)', () => {
    expect(puntosDeLinea([punto('2026-10-07T08:00:00Z', 0.5)], 'oee', 3_600_000)).toEqual([]);
  });
});
