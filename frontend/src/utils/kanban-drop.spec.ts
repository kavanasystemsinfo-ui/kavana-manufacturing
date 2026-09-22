import { describe, it, expect } from 'vitest';
import { resolveDropTarget, type KanbanItem } from './kanban-drop.js';

const items: KanbanItem[] = [
  { id: 'a', status: 'abierto' },
  { id: 'b', status: 'en_progreso' },
];

describe('resolveDropTarget (2.4 — soltar en el Kanban)', () => {
  it('soltar sobre una tarjeta de otra columna devuelve el estado de esa columna', () => {
    expect(resolveDropTarget('a', { id: 'b', columnStatus: 'en_progreso' }, items)).toBe('en_progreso');
  });

  it('soltar sobre el hueco de una columna vacía funciona (no depende de que haya tarjeta)', () => {
    expect(resolveDropTarget('a', { id: 'col:cerrado', columnStatus: null }, items)).toBe('cerrado');
  });

  it('soltar en la misma columna no hace nada: evita una llamada a la API inútil', () => {
    expect(resolveDropTarget('a', { id: 'a', columnStatus: 'abierto' }, items)).toBeNull();
    expect(resolveDropTarget('a', { id: 'col:abierto', columnStatus: null }, items)).toBeNull();
  });

  it('soltar fuera de cualquier columna no cambia nada', () => {
    expect(resolveDropTarget('a', null, items)).toBeNull();
  });

  it('un id que no es de columna ni de ninguna tarjeta no inventa destino', () => {
    expect(resolveDropTarget('a', { id: 'lo-que-sea' }, items)).toBeNull();
  });

  it('una tarjeta desconocida no genera movimiento', () => {
    expect(resolveDropTarget('zzz', { id: 'col:abierto' }, items)).toBeNull();
  });
});
