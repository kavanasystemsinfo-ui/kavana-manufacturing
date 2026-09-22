import { describe, it, expect } from 'vitest';
import { incidenciaMoveNotice, INCIDENCIA_STATUS_LABEL } from './incidencia-notice.js';

describe('incidenciaMoveNotice (2.4 — aviso al mover)', () => {
  it('nombra la incidencia y su nuevo estado', () => {
    expect(incidenciaMoveNotice('Avería en la sierra', 'en_progreso')).toBe('«Avería en la sierra» movida a En progreso');
  });

  it('usa la etiqueta en español, no el valor crudo del backend', () => {
    expect(incidenciaMoveNotice('X', 'cerrado')).toContain('Cerradas');
    expect(incidenciaMoveNotice('X', 'cerrado')).not.toContain('cerrado');
  });

  it('los cuatro estados del flujo tienen etiqueta', () => {
    for (const status of ['abierto', 'en_progreso', 'resuelto', 'cerrado']) {
      expect(INCIDENCIA_STATUS_LABEL[status]).toBeTruthy();
    }
  });

  it('un estado desconocido se muestra tal cual en vez de mentir con otra etiqueta', () => {
    expect(incidenciaMoveNotice('X', 'estado-nuevo')).toContain('estado-nuevo');
  });
});
