import { describe, expect, it } from 'vitest';
import { conteosDeOrdenes } from './resumen-conteos.js';

describe('conteosDeOrdenes', () => {
  it('usa los recuentos del servidor cuando los hay', () => {
    const r = conteosDeOrdenes(
      { pending: 22, in_progress: 8, completed: 310, cancelled: 19, total: 359 },
      [{ status: 'pending' }],
    );
    expect(r).toEqual({ total: 359, pendientes: 22, enProceso: 8, completadas: 310, canceladas: 19 });
  });

  it('sin recuentos del servidor cuenta el listado', () => {
    const r = conteosDeOrdenes(null, [
      { status: 'pending' }, { status: 'in_progress' }, { status: 'in_progress' }, { status: 'completed' },
    ]);
    expect(r).toEqual({ total: 4, pendientes: 1, enProceso: 2, completadas: 1, canceladas: 0 });
  });

  it('con el listado vacío todo es cero', () => {
    expect(conteosDeOrdenes(undefined, [])).toEqual({
      total: 0, pendientes: 0, enProceso: 0, completadas: 0, canceladas: 0,
    });
  });
});
