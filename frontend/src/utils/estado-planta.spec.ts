import { describe, expect, it } from 'vitest';
import { contarIncidencias, estadoPlanta } from './estado-planta.js';

describe('estadoPlanta', () => {
  it('verde cuando OEE y cumplimiento llegan al objetivo y no hay bloqueos', () => {
    const e = estadoPlanta({ oee: 88, cumplimiento: 101, bloqueantes: 0 });
    expect(e.nivel).toBe('verde');
    expect(e.titulo).toBe('La planta va bien');
  });

  it('ámbar con OEE entre 70 y 85', () => {
    expect(estadoPlanta({ oee: 78, cumplimiento: 100, bloqueantes: 0 }).nivel).toBe('ambar');
  });

  it('rojo si cualquiera de los dos está muy por debajo', () => {
    expect(estadoPlanta({ oee: 90, cumplimiento: 60, bloqueantes: 0 }).nivel).toBe('rojo');
    expect(estadoPlanta({ oee: 55, cumplimiento: 100, bloqueantes: 0 }).nivel).toBe('rojo');
  });

  it('una incidencia bloqueante baja un verde a ámbar, pero no un rojo a ámbar', () => {
    expect(estadoPlanta({ oee: 90, cumplimiento: 100, bloqueantes: 2 }).nivel).toBe('ambar');
    expect(estadoPlanta({ oee: 40, cumplimiento: 100, bloqueantes: 2 }).nivel).toBe('rojo');
  });

  it('sin OEE ni objetivo no inventa un estado', () => {
    const e = estadoPlanta({ oee: null, cumplimiento: null, bloqueantes: 3 });
    expect(e.nivel).toBe('sin_datos');
    expect(e.detalle).toEqual(['3 incidencias bloqueantes']);
  });

  it('solo con cumplimiento también valora', () => {
    expect(estadoPlanta({ oee: null, cumplimiento: 89, bloqueantes: 0 }).nivel).toBe('ambar');
  });

  it('el detalle enseña las cifras que justifican el estado', () => {
    const e = estadoPlanta({ oee: 81.2, cumplimiento: 89, bloqueantes: 1 });
    expect(e.detalle).toEqual([
      'OEE de planta 81 % (objetivo 85 %)',
      '89 % del objetivo de producción de hoy',
      '1 incidencia bloqueante',
    ]);
  });
});

describe('contarIncidencias', () => {
  it('cuenta abiertas y bloqueantes', () => {
    const r = contarIncidencias([
      { status: 'abierto', type: 'mantenimiento' },
      { status: 'abierto', type: 'calidad' },
      { status: 'en_progreso', type: 'seguridad' },
      { status: 'cerrado', type: 'seguridad' },
    ]);
    expect(r).toEqual({ abiertas: 3, bloqueantes: 1 });
  });
});
