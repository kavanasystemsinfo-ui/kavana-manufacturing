import { describe, it, expect } from 'vitest';
import { workstationBadge } from './workstation-badge.js';

describe('workstationBadge (2.3 — semáforo de puestos)', () => {
  it('en marcha: verde', () => {
    const badge = workstationBadge('running');
    expect(badge.label).toBe('En marcha');
    expect(badge.dot).toContain('green');
  });

  it('parada: rojo', () => {
    const badge = workstationBadge('stopped');
    expect(badge.label).toBe('Parada');
    expect(badge.dot).toContain('red');
  });

  it('sin actividad: ámbar', () => {
    const badge = workstationBadge('idle');
    expect(badge.label).toBe('Sin actividad');
    expect(badge.dot).toContain('amber');
  });

  it('un estado desconocido no se pinta como bueno ni como malo', () => {
    const badge = workstationBadge('lo-que-sea');
    expect(badge.label).toBe('Sin actividad');
    expect(badge.dot).toContain('amber');
  });

  it('sin dato (null o undefined) tampoco se inventa estado', () => {
    expect(workstationBadge(null).label).toBe('Sin actividad');
    expect(workstationBadge(undefined).label).toBe('Sin actividad');
  });

  it('el chip y el punto son clases distintas, para poder usarlas por separado', () => {
    const badge = workstationBadge('running');
    expect(badge.chip).not.toBe(badge.dot);
    expect(badge.chip).toContain('border');
  });
});
