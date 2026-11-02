/** Piezas que suma cada botón de una calculadora de embalaje. */
export interface PackingTotals {
  perPack: number;
  perRow: number;
  perPallet: number;
}

export function packingTotals(piecesPerPack: number, packsPerRow: number, rowsPerPallet: number): PackingTotals {
  return {
    perPack: piecesPerPack,
    perRow: piecesPerPack * packsPerRow,
    perPallet: piecesPerPack * packsPerRow * rowsPerPallet,
  };
}

/** Las cantidades de una calculadora son enteros de 1 en adelante; un contador nunca baja de 1. */
export function clampCount(value: number): number {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
}

/** «Palet estándar · 5 × 2 × 4 = 40», lo que se lee en el selector. */
export function calculatorLabel(c: { name: string; pieces_per_pack: number; packs_per_row: number; rows_per_pallet: number }): string {
  const t = packingTotals(c.pieces_per_pack, c.packs_per_row, c.rows_per_pallet);
  return `${c.name} · ${c.pieces_per_pack} × ${c.packs_per_row} × ${c.rows_per_pallet} = ${t.perPallet}`;
}
