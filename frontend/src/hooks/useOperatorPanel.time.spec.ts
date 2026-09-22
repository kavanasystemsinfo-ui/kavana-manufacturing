import { describe, it, expect } from 'vitest';
import { validateWorkBlockTimes } from './useOperatorPanel.js';

describe('validateWorkBlockTimes (input type=time nativo)', () => {
  it('acepta HH:MM válido con fin posterior a inicio', () => {
    expect(validateWorkBlockTimes('08:00', '09:30')).toBeNull();
  });

  it('acepta bloque que cruza medianoche (fin < inicio)', () => {
    expect(validateWorkBlockTimes('22:00', '06:00')).toBeNull();
  });

  it('rechaza horas vacías', () => {
    expect(validateWorkBlockTimes('', '09:30')).toBe('Las horas de inicio y fin son obligatorias.');
    expect(validateWorkBlockTimes('08:00', '')).toBe('Las horas de inicio y fin son obligatorias.');
  });

  it('rechaza formato no HH:MM', () => {
    expect(validateWorkBlockTimes('8:0', '09:30')).toBe('Las horas deben tener formato HH:MM completo.');
    expect(validateWorkBlockTimes('08:00', '9:3')).toBe('Las horas deben tener formato HH:MM completo.');
  });

  it('rechaza inicio igual a fin', () => {
    expect(validateWorkBlockTimes('08:00', '08:00')).toBe('La hora de fin debe ser posterior a la de inicio.');
  });

  it('acepta 23:59 a 00:00 (cruce de medianoche mínimo)', () => {
    expect(validateWorkBlockTimes('23:59', '00:00')).toBeNull();
  });
});
