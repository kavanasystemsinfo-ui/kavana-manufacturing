import { describe, expect, it } from 'vitest';
import { summarizeStatusCounts } from './status-counts.js';

describe('summarizeStatusCounts', () => {
  it('suma cada estado y el total', () => {
    const r = summarizeStatusCounts([
      { status: 'pending', n: 22 },
      { status: 'in_progress', n: 8 },
      { status: 'completed', n: 310 },
      { status: 'cancelled', n: 19 },
    ]);
    expect(r).toEqual({ pending: 22, in_progress: 8, completed: 310, cancelled: 19, total: 359 });
  });

  it('acepta los números como texto, que es lo que devuelve pg para COUNT', () => {
    expect(summarizeStatusCounts([{ status: 'completed', n: '24' }]).completed).toBe(24);
  });

  it('sin filas devuelve ceros', () => {
    expect(summarizeStatusCounts([])).toEqual({ pending: 0, in_progress: 0, completed: 0, cancelled: 0, total: 0 });
  });

  it('un estado desconocido cuenta en el total pero no rompe los demás', () => {
    const r = summarizeStatusCounts([{ status: 'otro', n: 2 }, { status: 'pending', n: 1 }]);
    expect(r.pending).toBe(1);
    expect(r.total).toBe(3);
  });

  it('ignora cantidades no numéricas o negativas', () => {
    expect(summarizeStatusCounts([{ status: 'pending', n: 'x' }, { status: 'completed', n: -4 }]).total).toBe(0);
  });
});
