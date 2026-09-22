import { describe, it, expect } from 'vitest';
import { offlineBannerState } from './offline-banner.js';

describe('offlineBannerState (2.9 — banner offline global)', () => {
  it('con conexión no muestra nada', () => {
    expect(offlineBannerState({ isOnline: true, pendingCount: 0 })).toBeNull();
    expect(offlineBannerState({ isOnline: true, pendingCount: 5 })).toBeNull();
  });

  it('sin conexión avisa de que se puede seguir trabajando', () => {
    const state = offlineBannerState({ isOnline: false, pendingCount: 0 });
    expect(state?.text).toContain('Sin conexión');
    expect(state?.text).toContain('guardan en el dispositivo');
  });

  it('singular cuando hay un solo parte pendiente', () => {
    expect(offlineBannerState({ isOnline: false, pendingCount: 1 })?.detail).toBe('1 parte pendiente de enviar');
  });

  it('plural cuando hay varios', () => {
    expect(offlineBannerState({ isOnline: false, pendingCount: 4 })?.detail).toBe('4 partes pendientes de enviar');
  });

  it('sin pendientes lo dice en lugar de mostrar un cero', () => {
    expect(offlineBannerState({ isOnline: false, pendingCount: 0 })?.detail).toBe('No hay partes pendientes de enviar');
  });

  it('nunca muestra un número negativo aunque la cola llegue corrupta', () => {
    const state = offlineBannerState({ isOnline: false, pendingCount: -3 });
    expect(state?.detail).toBe('No hay partes pendientes de enviar');
  });
});
