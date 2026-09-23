import { describe, it, expect } from 'vitest';
import { COLUMNAS_INCIDENCIAS, incidenciasHuerfanas } from './incidencias-kanban.js';

describe('Tablero de incidencias', () => {
  it('las columnas son los cuatro estados que acepta el backend, en orden de flujo', () => {
    // Si el backend añade un estado y aquí no, las incidencias de ese estado
    // dejarían de tener columna: el contrato va atado a propósito.
    expect(COLUMNAS_INCIDENCIAS.map((c) => c.status)).toEqual([
      'abierto',
      'en_progreso',
      'resuelto',
      'cerrado',
    ]);
    for (const columna of COLUMNAS_INCIDENCIAS) {
      expect(columna.title.length).toBeGreaterThan(0);
    }
  });

  it('una incidencia con estado conocido no es huérfana', () => {
    expect(incidenciasHuerfanas([{ id: 'a', status: 'en_progreso' }])).toEqual([]);
  });

  it('una incidencia con un estado que no tiene columna NO se puede perder', () => {
    // Dato viejo o typo: si desaparece del tablero, nadie se entera de que sigue
    // abierta.
    const huerfanas = incidenciasHuerfanas([
      { id: 'a', status: 'abierto' },
      { id: 'b', status: 'pendiente_de_pieza' },
    ]);
    expect(huerfanas.map((i) => i.id)).toEqual(['b']);
  });

  it('una incidencia sin estado también se lista aparte', () => {
    expect(incidenciasHuerfanas([{ id: 'c', status: null }]).map((i) => i.id)).toEqual(['c']);
    expect(incidenciasHuerfanas([{ id: 'd' }]).map((i) => i.id)).toEqual(['d']);
  });
});
