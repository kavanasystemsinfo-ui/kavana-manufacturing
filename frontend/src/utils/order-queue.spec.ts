import { describe, expect, it } from 'vitest';
import { buildOrderQueue, formatQuantity, orderLabel, orderProgress, type QueueOrder } from './order-queue.js';

const order = (id: string, status: string, created: string, extra: Partial<QueueOrder> = {}): QueueOrder => ({
  id,
  status,
  quantity: 1000,
  created_at: created,
  ...extra,
});

describe('buildOrderQueue', () => {
  it('separa lo en curso de lo pendiente y ordena las pendientes de más antigua a más nueva', () => {
    const q = buildOrderQueue([
      order('c', 'pending', '2026-10-31T00:00:00Z'),
      order('a', 'in_progress', '2026-11-02T00:00:00Z'),
      order('b', 'pending', '2026-10-30T00:00:00Z'),
    ]);
    expect(q.inProgress.map((o) => o.id)).toEqual(['a']);
    expect(q.next.map((o) => o.id)).toEqual(['b', 'c']);
    expect(q.backlog).toEqual([]);
  });

  it('manda al backlog lo que pasa del límite', () => {
    const orders = Array.from({ length: 8 }, (_, i) => order(`o${i}`, 'pending', `2026-10-${10 + i}T00:00:00Z`));
    const q = buildOrderQueue(orders, 3);
    expect(q.next).toHaveLength(3);
    expect(q.backlog.map((o) => o.id)).toEqual(['o3', 'o4', 'o5', 'o6', 'o7']);
  });

  it('desempata por código cuando la fecha es la misma', () => {
    const q = buildOrderQueue([
      order('1', 'pending', '2026-10-30T00:00:00Z', { code: 'ORD-B' }),
      order('2', 'pending', '2026-10-30T00:00:00Z', { code: 'ORD-A' }),
    ]);
    expect(q.next.map((o) => o.code)).toEqual(['ORD-A', 'ORD-B']);
  });
});

describe('orderLabel', () => {
  it('usa el código y, sin él, el principio del id', () => {
    expect(orderLabel({ id: '9c7db592-5134', code: '4283' })).toBe('Orden 4283');
    expect(orderLabel({ id: '9c7db592-5134', code: 'SIM-261102-01' })).toBe('SIM-261102-01');
    expect(orderLabel({ id: '9c7db592-5134', code: null })).toBe('#9c7db592');
  });
});

describe('formatQuantity', () => {
  it('pone separador de miles y unidad', () => {
    expect(formatQuantity(357120)).toBe('357.120 uds');
    expect(formatQuantity('4000')).toBe('4.000 uds');
    expect(formatQuantity(999)).toBe('999 uds');
    expect(formatQuantity(1234567)).toBe('1.234.567 uds');
    expect(formatQuantity(null)).toBe('0 uds');
  });
});

describe('orderProgress', () => {
  it('calcula el porcentaje y lo limita a 100', () => {
    expect(orderProgress({ quantity: 1000, produced_quantity: 250 })).toBe(25);
    expect(orderProgress({ quantity: 1000, produced_quantity: '1500' })).toBe(100);
    expect(orderProgress({ quantity: 0, produced_quantity: 5 })).toBe(0);
    expect(orderProgress({ quantity: 1000 })).toBe(0);
  });
});
