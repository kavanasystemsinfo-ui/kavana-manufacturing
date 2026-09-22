import { describe, it, expect, beforeEach } from 'vitest';
import { useOperatorPanelStore } from '../store/operator-panel-store.js';

const D = (h: number, m = 0) => `2026-09-22T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;

describe('Operario: Repetir último bloque (2.1)', () => {
  beforeEach(() => {
    useOperatorPanelStore.setState({
      lastBlock: null,
      producedQuantity: '',
      defectQuantity: '0',
      startTime: '',
      endTime: '',
      observations: '',
    });
  });

  it('no hace nada si no hay último bloque declarado', () => {
    useOperatorPanelStore.getState().repeatLastBlock();
    const state = useOperatorPanelStore.getState();
    expect(state.producedQuantity).toBe('');
    expect(state.startTime).toBe('');
    expect(state.observations).toBe('');
  });

  it('pre-rellena formulario con el último bloque y fija el fin a la hora actual', () => {
    const { repeatLastBlock, setLastBlock } = useOperatorPanelStore.getState();
    setLastBlock({
      startTime: '08:00',
      endTime: '10:00',
      producedQuantity: 50,
      defectQuantity: 2,
      observations: 'Turno normal',
    });
    repeatLastBlock();
    const state = useOperatorPanelStore.getState();
    expect(state.startTime).toBe('08:00');
    expect(state.producedQuantity).toBe('50');
    expect(state.defectQuantity).toBe('2');
    expect(state.observations).toBe('Turno normal');
    expect(state.endTime).toMatch(/^\d{2}:\d{2}$/);
    expect(state.endTime).not.toBe('10:00');
  });

  it('no arrastra el fin del bloque anterior', () => {
    const store = useOperatorPanelStore.getState();
    store.setEndTime('23:59');
    store.setLastBlock({
      startTime: '07:00',
      endTime: '09:00',
      producedQuantity: 10,
      defectQuantity: 0,
      observations: '',
    });
    useOperatorPanelStore.getState().repeatLastBlock();
    expect(useOperatorPanelStore.getState().endTime).not.toBe('23:59');
  });
});

describe('Operario: Mi turno hoy KPI (2.2)', () => {
  it('delega en el cálculo puro y expone los indicadores del turno', () => {
    const kpi = useOperatorPanelStore.getState().calculateShiftKPI([
      { type: 'produccion', start_time: D(8), end_time: D(10), produced_quantity: 100, defect_quantity: 2 },
      { type: 'produccion', start_time: D(10, 15), end_time: D(12), produced_quantity: 80, defect_quantity: 1 },
      { type: 'parada', start_time: D(10), end_time: D(10, 15), downtime_reason: 'Cambio herramienta' },
    ]);
    expect(kpi.horasNetas).toBe(4);
    expect(kpi.horasProduccion).toBe(3.75);
    expect(kpi.horasParada).toBe(0.25);
    expect(kpi.buenas).toBe(180);
    expect(kpi.defectos).toBe(3);
    expect(kpi.calidad).toBe(98);
    expect(kpi.oeePersonal).toBeGreaterThan(0);
  });
});
