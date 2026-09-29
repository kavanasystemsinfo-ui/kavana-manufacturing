import { describe, expect, it } from 'vitest';
import {
  buildOrderQuery,
  presetFromStatus,
  statusFromPreset,
  DEFAULT_ORDER_FILTERS,
  ORDER_STATUS_PRESETS,
  ORDENES_POR_PAGINA,
} from './order-filters.js';

describe('buildOrderQuery', () => {
  it('no añade nada cuando no hay filtros', () => {
    expect(buildOrderQuery()).toBe('');
  });

  it('manda el estado como lista separada por comas', () => {
    expect(buildOrderQuery({ status: ['pending', 'in_progress'] })).toContain('status=pending%2Cin_progress');
  });

  it('no manda la clave de estado cuando la lista está vacía', () => {
    expect(buildOrderQuery({ status: [] })).not.toContain('status=');
  });

  it('recorta el texto de búsqueda y no lo manda si queda vacío', () => {
    expect(buildOrderQuery({ q: '  ORD-7  ' })).toContain('q=ORD-7');
    expect(buildOrderQuery({ q: '   ' })).not.toContain('q=');
  });

  it('no manda el puesto cuando es cadena vacía', () => {
    expect(buildOrderQuery({ workstationId: '' })).not.toContain('workstation_id');
    expect(buildOrderQuery({ workstationId: 'ws-1' })).toContain('workstation_id=ws-1');
  });

  it('siempre lleva tope, con el valor por defecto si no se le dice otro', () => {
    expect(buildOrderQuery({ status: ['pending'] })).toContain(`limit=${ORDENES_POR_PAGINA}`);
    expect(buildOrderQuery({ limit: 25 })).toContain('limit=25');
  });

  it('el desplazamiento solo aparece cuando hay uno', () => {
    expect(buildOrderQuery({ limit: 25, offset: 0 })).not.toContain('offset=');
    expect(buildOrderQuery({ limit: 25, offset: 50 })).toContain('offset=50');
  });
});

describe('presets de estado', () => {
  it('el preset por defecto mira las órdenes vivas, no el histórico', () => {
    expect(DEFAULT_ORDER_FILTERS.status).toEqual(['pending', 'in_progress']);
  });

  it('ida y vuelta entre preset y lista de estados', () => {
    for (const preset of ORDER_STATUS_PRESETS) {
      expect(statusFromPreset(preset.value)).toEqual(preset.status);
      expect(presetFromStatus(preset.status)).toBe(preset.value);
    }
  });

  it('el orden de los estados no cambia el preset reconocido', () => {
    expect(presetFromStatus(['in_progress', 'pending'])).toBe('activas');
  });

  it('un preset desconocido cae a las órdenes activas', () => {
    expect(statusFromPreset('inventado')).toEqual(['pending', 'in_progress']);
  });

  it('una combinación de estados sin preset propio cae a activas', () => {
    expect(presetFromStatus(['pending', 'completed'])).toBe('activas');
  });
});
