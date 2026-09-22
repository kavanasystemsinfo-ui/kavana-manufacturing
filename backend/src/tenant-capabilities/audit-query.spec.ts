import { describe, it, expect } from 'vitest';
import { parseAuditQuery, DEFAULT_LIMIT, MAX_LIMIT } from './audit-query.js';

describe('parseAuditQuery (2.7)', () => {
  it('sin parámetros usa el límite por defecto y la primera página', () => {
    expect(parseAuditQuery({})).toEqual({ limit: DEFAULT_LIMIT, offset: 0, from: null, to: null });
  });

  it('acota el límite pedido al máximo, sin fallar', () => {
    expect(parseAuditQuery({ limit: '9999' }).limit).toBe(MAX_LIMIT);
  });

  it('un límite de cero o negativo no deja la consulta vacía: se usa el mínimo de 1', () => {
    expect(parseAuditQuery({ limit: '0' }).limit).toBe(1);
    expect(parseAuditQuery({ limit: '-5' }).limit).toBe(1);
  });

  it('un límite que no es número cae al valor por defecto', () => {
    expect(parseAuditQuery({ limit: 'muchas' }).limit).toBe(DEFAULT_LIMIT);
  });

  it('el desplazamiento no puede ser negativo', () => {
    expect(parseAuditQuery({ offset: '-10' }).offset).toBe(0);
    expect(parseAuditQuery({ offset: '40' }).offset).toBe(40);
  });

  it('acepta fechas en formato día y las convierte en límites del día completo', () => {
    expect(parseAuditQuery({ from: '2026-09-01', to: '2026-09-30' })).toEqual({
      limit: DEFAULT_LIMIT,
      offset: 0,
      from: '2026-09-01T00:00:00Z',
      to: '2026-09-30T23:59:59Z',
    });
  });

  it('una fecha mal escrita se ignora en lugar de romper la consulta', () => {
    expect(parseAuditQuery({ from: '01/09/2026' }).from).toBeNull();
    expect(parseAuditQuery({ to: 'ayer' }).to).toBeNull();
  });

  it('acepta un instante ISO completo tal cual', () => {
    expect(parseAuditQuery({ from: '2026-09-01T08:30:00Z' }).from).toBe('2026-09-01T08:30:00Z');
  });
});
