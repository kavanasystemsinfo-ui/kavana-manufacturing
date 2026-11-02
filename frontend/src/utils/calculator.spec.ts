import { describe, expect, it } from 'vitest';
import { calculatorLabel, clampCount, packingTotals } from './calculator.js';

describe('packingTotals', () => {
  it('calcula paquete, fila y palet', () => {
    expect(packingTotals(5, 2, 4)).toEqual({ perPack: 5, perRow: 10, perPallet: 40 });
  });
});

describe('clampCount', () => {
  it('no baja de 1 ni acepta decimales o basura', () => {
    expect(clampCount(0)).toBe(1);
    expect(clampCount(-3)).toBe(1);
    expect(clampCount(2.6)).toBe(3);
    expect(clampCount(Number.NaN)).toBe(1);
  });
});

describe('calculatorLabel', () => {
  it('resume nombre y medidas', () => {
    expect(calculatorLabel({ name: 'Palet K-100', pieces_per_pack: 5, packs_per_row: 2, rows_per_pallet: 4 })).toBe(
      'Palet K-100 · 5 × 2 × 4 = 40',
    );
  });
});
