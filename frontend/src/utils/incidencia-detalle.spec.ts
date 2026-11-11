import { describe, expect, it } from 'vitest';
import { detalleIncidencia, fechaHoraIncidencia } from './incidencia-detalle.js';

const inc = {
  workstation_id: 'ws-1',
  order_id: 'or-1',
  reported_by: 'us-1',
  created_at: '2026-10-24T12:35:00.000Z',
};

describe('detalleIncidencia (T-093)', () => {
  it('traduce puesto, operario y orden a nombres y da la fecha con hora', () => {
    const d = detalleIncidencia(inc, {
      puestos: { 'ws-1': 'Sierra 2' },
      operarios: { 'us-1': 'Ana Pérez' },
      ordenes: { 'or-1': 'OP-45' },
    });
    expect(d.puesto).toBe('Sierra 2');
    expect(d.operario).toBe('Ana Pérez');
    expect(d.orden).toBe('OP-45');
    expect(d.cuando).toBe('24/10/2026 14:35'); // 12:35 UTC = 14:35 en España (CEST)
  });

  it('si no conoce un nombre lo omite en vez de enseñar el UUID', () => {
    const d = detalleIncidencia(inc, { puestos: { 'ws-1': 'Sierra 2' } });
    expect(d.puesto).toBe('Sierra 2');
    expect(d.operario).toBeNull();
    expect(d.orden).toBeNull();
  });

  it('una incidencia sin puesto ni orden no rompe', () => {
    const d = detalleIncidencia({ created_at: inc.created_at }, { puestos: {} });
    expect(d.puesto).toBeNull();
    expect(d.orden).toBeNull();
  });

  it('una fecha inválida da cadena vacía', () => {
    expect(fechaHoraIncidencia('no-es-fecha')).toBe('');
  });
});
