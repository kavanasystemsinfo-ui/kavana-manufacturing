/** Formateo de números en formato español (Europeo). */

export function formatQuantity(value: number | string | undefined | null): string {
  if (value === null || value === undefined) return '0';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return '0';
  if (n === Math.trunc(n)) return n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDecimal(value: number | string | undefined | null): string {
  if (value === null || value === undefined) return '0,00';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return '0,00';
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
