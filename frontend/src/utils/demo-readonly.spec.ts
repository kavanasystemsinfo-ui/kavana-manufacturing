import { describe, expect, it } from 'vitest';
import {
  DEMO_DELETE_NOTICE,
  DEMO_MOVE_NOTICE,
  isDemoReadOnlyError,
  orderMoveNotice,
} from './demo-readonly.js';

describe('isDemoReadOnlyError', () => {
  it('reconoce el rechazo del blindaje de la demo', () => {
    expect(
      isDemoReadOnlyError(
        'Demo de solo lectura: los datos existentes no se pueden modificar ni borrar. Crea datos nuevos (caducan a las 24h).',
      ),
    ).toBe(true);
  });

  it('no confunde un fallo real con el aviso de la demo', () => {
    expect(isDemoReadOnlyError('Error updating order')).toBe(false);
    expect(isDemoReadOnlyError('Failed to fetch')).toBe(false);
    expect(isDemoReadOnlyError('')).toBe(false);
  });

  it('aguanta que el error no sea texto', () => {
    expect(isDemoReadOnlyError(undefined)).toBe(false);
    expect(isDemoReadOnlyError(null)).toBe(false);
    expect(isDemoReadOnlyError({ message: 'Demo de solo lectura' })).toBe(false);
  });
});

describe('avisos de la demo', () => {
  it('el aviso de movimiento dice que no se guarda, sin lenguaje de error', () => {
    expect(DEMO_MOVE_NOTICE).toContain('solo lectura');
    expect(DEMO_MOVE_NOTICE.toLowerCase()).not.toContain('error');
  });

  it('el aviso de borrado explica por qué no se borra', () => {
    expect(DEMO_DELETE_NOTICE).toContain('solo lectura');
  });

  it('la confirmación de un movimiento guardado nombra la orden y su estado', () => {
    expect(orderMoveNotice('OP-12', 'in_progress')).toBe('La orden OP-12 pasa a En Progreso.');
  });

  it('sin código de orden no deja un hueco raro', () => {
    expect(orderMoveNotice(null, 'completed')).toContain('sin número');
  });
});
