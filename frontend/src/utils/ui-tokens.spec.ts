import { describe, it, expect } from 'vitest';
import { alertClass, ALERT_VARIANTS } from './ui-tokens.js';

describe('Clases de aviso (design tokens)', () => {
  it('cada variante tiene sus dos temas: si falta una, la pantalla sale sin estilo', () => {
    for (const variante of Object.keys(ALERT_VARIANTS) as Array<keyof typeof ALERT_VARIANTS>) {
      expect(ALERT_VARIANTS[variante].classic.length, variante).toBeGreaterThan(0);
      expect(ALERT_VARIANTS[variante].modern.length, variante).toBeGreaterThan(0);
    }
  });

  it('el aviso de error es el mismo en toda la aplicación', () => {
    // Estaba copiado literalmente en seis pestañas: cualquier retoque había que
    // hacerlo seis veces y siempre se olvidaba alguna.
    expect(alertClass('error', true)).toBe(ALERT_VARIANTS.error.classic);
    expect(alertClass('error', false)).toBe(ALERT_VARIANTS.error.modern);
  });

  it('sin valor de tema usa el moderno, que es el que traen los paneles por defecto', () => {
    expect(alertClass('error', undefined)).toBe(ALERT_VARIANTS.error.modern);
  });

  it('los dos temas no comparten clases: el clásico es claro y el moderno oscuro', () => {
    expect(ALERT_VARIANTS.error.classic).not.toBe(ALERT_VARIANTS.error.modern);
    expect(ALERT_VARIANTS.error.modern).toContain('red-900');
  });
});
