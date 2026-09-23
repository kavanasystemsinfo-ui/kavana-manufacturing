import { describe, it, expect } from 'vitest';
import { ordersEmptyState } from './orders-empty-state.js';

describe('ordersEmptyState (U1)', () => {
  it('sin puesto asignado dice a quién pedírselo: el operario no puede arreglarlo solo', () => {
    const state = ordersEmptyState('', null);
    expect(state.title).toBe('Sin puesto asignado');
    expect(state.description).toContain('supervisor');
  });

  it('con puesto y sin órdenes explica que no hay trabajo asignado, no que falte el puesto', () => {
    const state = ordersEmptyState('', 'Puesto E2E');
    expect(state.title).toBe('Sin órdenes disponibles');
    expect(state.description).toContain('tu puesto');
    expect(state.description).not.toContain('supervisor');
  });

  it('si el operario está buscando, manda el criterio de búsqueda sobre todo lo demás', () => {
    const state = ordersEmptyState('torno', null);
    expect(state.description).toContain('criterio');
  });
});
