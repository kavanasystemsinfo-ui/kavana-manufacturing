import { describe, expect, it } from 'vitest';
import { etiquetaParada } from './parada-etiqueta.js';

describe('etiquetaParada', () => {
  it('traduce las claves conocidas', () => {
    expect(etiquetaParada('mantenimiento_menor')).toBe('Mantenimiento menor');
    expect(etiquetaParada('cambio_formato')).toBe('Cambio de formato');
    expect(etiquetaParada('falta_material')).toBe('Falta de material');
    expect(etiquetaParada('averia_menor')).toBe('Avería menor');
  });

  it('una clave nueva se muestra en claro y con mayúscula inicial', () => {
    expect(etiquetaParada('cambio_de_troquel')).toBe('Cambio de troquel');
    expect(etiquetaParada('pausa programada')).toBe('Pausa programada');
  });

  it('deja pasar «Otros» y un motivo vacío no rompe', () => {
    expect(etiquetaParada('Otros')).toBe('Otros');
    expect(etiquetaParada('   ')).toBe('Sin motivo');
  });
});
