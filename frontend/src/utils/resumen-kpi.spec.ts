import { describe, expect, it } from 'vitest';
import { rendimientoDelDia, unidades } from './resumen-kpi.js';

/**
 * Regresi�n del bug del panel: produced_quantity llega de pg como NUMERIC
 * (string "1827.0000") y el reduce lo concatenaba con el acumulador number,
 * dando "01827.00001328.0000..." en "Producci�n real" y NaN en el
 * cumplimiento. El c�lculo tiene que devolver SIEMPRE n�meros de verdad.
 */

const HOY = new Date(2026, 9, 7, 12, 0, 0); // 7 de octubre de 2026, mediod�a

function orden(creadaEn: Date, campos: Record<string, unknown>) {
  return {
    created_at: creadaEn.toISOString(),
    quantity: 0,
    produced_quantity: 0,
    ...campos,
  };
}

describe('unidades', () => {
  it('convierte el NUMERIC de pg a n�mero', () => {
    expect(unidades('1827.0000')).toBe(1827);
    expect(unidades(42)).toBe(42);
    expect(unidades(0)).toBe(0);
  });

  it('basura y nulos valen cero, nunca NaN', () => {
    expect(unidades('01827.00001328.0000')).toBe(0);
    expect(unidades(undefined)).toBe(0);
    expect(unidades(null)).toBe(0);
    expect(unidades('')).toBe(0);
    expect(unidades(Number.NaN)).toBe(0);
    expect(unidades(-5)).toBe(0);
  });
});

describe('rendimientoDelDia', () => {
  it('suma los NUMERIC del d�a sin concatenarlos', () => {
    const pedidos = [
      orden(HOY, { quantity: 1000, produced_quantity: '1827.0000' }),
      orden(HOY, { quantity: 500, produced_quantity: '1328.0000' }),
    ];

    const r = rendimientoDelDia(pedidos, HOY);

    expect(r.objetivo).toBe(1500);
    expect(r.real).toBe(3155);
    expect(typeof r.real).toBe('number');
    expect(r.cumplimiento).toBe(210);
    expect(r.progresoPct).toBe(100);
    expect(r.nivel).toBe('verde');
  });

  it('ignora las �rdenes de otros d�as', () => {
    const ayer = new Date(2026, 9, 6, 12, 0, 0);
    const pedidos = [
      orden(ayer, { quantity: 9999, produced_quantity: '9999.0000' }),
      orden(HOY, { quantity: 100, produced_quantity: '50.0000' }),
    ];

    const r = rendimientoDelDia(pedidos, HOY);

    expect(r.objetivo).toBe(100);
    expect(r.real).toBe(50);
    expect(r.cumplimiento).toBe(50);
    expect(r.nivel).toBe('rojo');
  });

  it('un valor ilegible no contamina la suma', () => {
    const pedidos = [
      orden(HOY, { quantity: 100, produced_quantity: 'no-es-un-numero' }),
      orden(HOY, { quantity: 100, produced_quantity: '200.0000' }),
    ];

    const r = rendimientoDelDia(pedidos, HOY);

    expect(r.real).toBe(200);
    expect(Number.isNaN(r.real)).toBe(false);
    expect(r.cumplimiento).toBe(100);
  });

  it('sin objetivo no hay cumplimiento que mostrar', () => {
    const r = rendimientoDelDia([orden(HOY, { quantity: 0, produced_quantity: 0 })], HOY);

    expect(r.cumplimiento).toBeNull();
    expect(r.progresoPct).toBe(0);
    expect(r.nivel).toBe('verde');
  });

  it('la barra se acota en 100 % aunque el cumplimiento pueda superarlo', () => {
    const r = rendimientoDelDia(
      [orden(HOY, { quantity: 100, produced_quantity: '150.0000' })],
      HOY,
    );

    expect(r.cumplimiento).toBe(150);
    expect(r.progresoPct).toBe(100);
  });

  it('pinta seg�n los umbrales del panel', () => {
    const nivel = (producido: number) =>
      rendimientoDelDia([orden(HOY, { quantity: 1000, produced_quantity: producido })], HOY).nivel;

    expect(nivel(950)).toBe('verde');
    expect(nivel(850)).toBe('ambar');
    expect(nivel(799)).toBe('rojo');
  });
});
