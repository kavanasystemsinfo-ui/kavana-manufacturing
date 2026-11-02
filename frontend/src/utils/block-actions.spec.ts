import { describe, expect, it } from 'vitest';
import { pauseBlock, resumeBlock } from './block-actions.js';

const now = new Date('2026-11-02T10:20:00.000Z');

describe('pauseBlock', () => {
  it('registra la parada en el instante de pulsar, con su motivo y sin piezas', () => {
    expect(pauseBlock('Falta material', now)).toEqual([
      'parada',
      '2026-11-02T10:20:00.000Z',
      '2026-11-02T10:20:00.000Z',
      'Falta material',
      0,
      0,
      null,
    ]);
  });
});

describe('resumeBlock', () => {
  it('abre un bloque de producción de un minuto sin motivo ni piezas', () => {
    expect(resumeBlock(now)).toEqual([
      'produccion',
      '2026-11-02T10:20:00.000Z',
      '2026-11-02T10:21:00.000Z',
      null,
      0,
      0,
      null,
    ]);
  });
});
