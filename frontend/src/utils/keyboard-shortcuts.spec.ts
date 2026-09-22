import { describe, it, expect } from 'vitest';
import { matchGlobalShortcut } from './keyboard-shortcuts.js';

describe('matchGlobalShortcut (2.8 — atajo del asistente)', () => {
  it('Cmd+K en Mac abre el asistente', () => {
    expect(matchGlobalShortcut({ key: 'k', metaKey: true })).toBe('toggle-advisor');
  });

  it('Ctrl+K en Windows y Linux abre el asistente', () => {
    expect(matchGlobalShortcut({ key: 'k', ctrlKey: true })).toBe('toggle-advisor');
  });

  it('reconoce la K mayúscula (Shift pulsado)', () => {
    expect(matchGlobalShortcut({ key: 'K', ctrlKey: true })).toBe('toggle-advisor');
  });

  it('K sin modificador no abre nada: escribir en un campo debe seguir funcionando', () => {
    expect(matchGlobalShortcut({ key: 'k' })).toBeNull();
  });

  it('Alt+K no abre nada', () => {
    expect(matchGlobalShortcut({ key: 'k', altKey: true })).toBeNull();
    expect(matchGlobalShortcut({ key: 'k', ctrlKey: true, altKey: true })).toBeNull();
  });

  it('Escape cierra el asistente', () => {
    expect(matchGlobalShortcut({ key: 'Escape' })).toBe('close-advisor');
  });

  it('Escape con modificador no se interpreta como cierre', () => {
    expect(matchGlobalShortcut({ key: 'Escape', ctrlKey: true })).toBeNull();
  });

  it('otras teclas no producen acción', () => {
    expect(matchGlobalShortcut({ key: 'a' })).toBeNull();
    expect(matchGlobalShortcut({ key: 'Enter' })).toBeNull();
    expect(matchGlobalShortcut({ key: '' })).toBeNull();
  });
});
