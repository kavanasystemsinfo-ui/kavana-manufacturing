import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHmiStore } from './hmi-store.js';
import { localDb } from '../db/local-db.js';
import { callApiWithTimeout } from '../api/client.js';

// Mock dependencies
vi.mock('../db/local-db.js', () => ({
  localDb: {
    offlineBlocks: {
      add: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      orderBy: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(undefined) }),
      delete: vi.fn(),
    },
    failedBlocks: {
      count: vi.fn().mockResolvedValue(0),
      put: vi.fn(),
      delete: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    tenantConfig: {
      put: vi.fn(),
      get: vi.fn(),
    },
    snapshots: {
      put: vi.fn(),
      get: vi.fn(),
      clear: vi.fn(),
    }
  }
}));

vi.mock('../api/client.js', () => ({
  callApiWithTimeout: vi.fn(),
}));

describe('HmiStore (Zustand) - Work Blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHmiStore.setState({
      currentStatus: 'pending',
      isOnline: true,
      pendingCount: 0,
      failedCount: 0,
      orderId: 'ord-1',
      workstationId: 'ws-1',
      operatorId: 'op-1',
    });
  });

  it('debería registrar un bloque de producción en offlineBlocks y actualizar cola', async () => {
    const { registerWorkBlock } = useHmiStore.getState();
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 3600000).toISOString();

    await registerWorkBlock(
      'produccion', 
      startTime, endTime, 
      null, 500, 10
    );

    expect(localDb.offlineBlocks.add).toHaveBeenCalledTimes(1);
    const addedBlock = vi.mocked(localDb.offlineBlocks.add).mock.calls[0][0];
    
    expect(addedBlock.type).toBe('produccion');
    expect(addedBlock.order_id).toBe('ord-1');
    expect(addedBlock.workstation_id).toBe('ws-1');
    expect(addedBlock.operator_id).toBe('op-1');
    expect(addedBlock.produced_quantity).toBe(500);
    expect(addedBlock.defect_quantity).toBe(10);
    expect(addedBlock.start_time).toBe(startTime);
    expect(addedBlock.end_time).toBe(endTime);
  });

  it('debería registrar un bloque de parada en offlineBlocks con motivo', async () => {
    const { registerWorkBlock } = useHmiStore.getState();
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 3600000).toISOString();

    await registerWorkBlock(
      'parada', 
      startTime, endTime, 
      'Avería máquina', undefined, undefined
    );

    expect(localDb.offlineBlocks.add).toHaveBeenCalledTimes(1);
    const addedBlock = vi.mocked(localDb.offlineBlocks.add).mock.calls[0][0];
    
    expect(addedBlock.type).toBe('parada');
    expect(addedBlock.order_id).toBe('ord-1');
    expect(addedBlock.downtime_reason).toBe('Avería máquina');
    expect(addedBlock.produced_quantity).toBeUndefined();
  });

  it('no debería registrar bloque si falta contexto del operario', async () => {
    useHmiStore.setState({ orderId: null, workstationId: null, operatorId: null });
    const { registerWorkBlock } = useHmiStore.getState();
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 3600000).toISOString();

    await registerWorkBlock('produccion', startTime, endTime, null, 500, 10);

    expect(localDb.offlineBlocks.add).not.toHaveBeenCalled();
  });
});

// El parte se firma con la identidad de la sesión, nunca con la que venga en el
// enlace: un quiosco compartido no puede atribuir producción a otra persona.
describe('HmiStore - identidad del operario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHmiStore.setState({
      userId: 'op-sesion',
      operatorId: null,
      orderId: null,
      workstationId: null,
      isOnline: true,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('ignora el operator_id de la URL y toma el operario de la sesión', async () => {
    window.history.replaceState({}, '', '/?order_id=ord-url&workstation_id=ws-url&operator_id=op-ajeno');
    vi.mocked(callApiWithTimeout).mockResolvedValue({
      operatorId: 'op-sesion',
      operatorName: 'Operario de sesión',
      workstationId: null,
      workstationName: null,
    } as never);

    await useHmiStore.getState().loadOperatorContext();

    const state = useHmiStore.getState();
    expect(state.operatorId).toBe('op-sesion');
    // La URL sí sigue sirviendo para dejar preparados orden y puesto.
    expect(state.orderId).toBe('ord-url');
    expect(state.workstationId).toBe('ws-url');
  });

  it('sin API, cae al usuario de la sesión y no al de la URL', async () => {
    window.history.replaceState({}, '', '/?operator_id=op-ajeno');
    vi.mocked(callApiWithTimeout).mockRejectedValue(new Error('sin red') as never);

    await useHmiStore.getState().loadOperatorContext();

    expect(useHmiStore.getState().operatorId).toBe('op-sesion');
  });
});

// La red en planta va a ratos: el operario tiene que poder elegir orden aunque
// acabe de recargar sin cobertura. La copia vive en IndexedDB y se purga al
// cerrar sesión, no en la caché del navegador.
describe('HmiStore - copia local de las órdenes', () => {
  const ORDENES = [
    {
      id: 'ord-cache',
      code: 'ORD-CACHE',
      status: 'pending',
      quantity: 100,
      workstation_id: 'ws-1',
      workstation_name: 'Puesto E2E',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useHmiStore.setState({ isOnline: true, availableOrders: [], isLoadingOrders: false, tenantId: '1' });
  });

  it('con red, guarda la lista para cuando no haya red', async () => {
    vi.mocked(callApiWithTimeout).mockResolvedValue(ORDENES as never);

    await useHmiStore.getState().loadAvailableOrders();

    expect(useHmiStore.getState().availableOrders).toHaveLength(1);
    expect(localDb.snapshots.put).toHaveBeenCalledTimes(1);
    const guardado = vi.mocked(localDb.snapshots.put).mock.calls[0][0] as {
      id: string;
      payload: unknown;
    };
    expect(guardado.id).toBe('ordenes-disponibles');
    expect(guardado.payload).toEqual(ORDENES);
  });

  it('sin red, la lista sale de la copia del dispositivo', async () => {
    vi.mocked(localDb.snapshots.get).mockResolvedValue({ id: 'ordenes-disponibles', payload: ORDENES } as never);
    useHmiStore.setState({ isOnline: false });

    await useHmiStore.getState().loadAvailableOrders();

    expect(useHmiStore.getState().availableOrders).toEqual(ORDENES);
    // Sin red no se llama al servidor: ni se intenta.
    expect(callApiWithTimeout).not.toHaveBeenCalled();
  });

  it('si el servidor no responde, se sigue con la copia en vez de quedarse vacío', async () => {
    vi.mocked(callApiWithTimeout).mockRejectedValue(new Error('503') as never);
    vi.mocked(localDb.snapshots.get).mockResolvedValue({ id: 'ordenes-disponibles', payload: ORDENES } as never);

    await useHmiStore.getState().loadAvailableOrders();

    expect(useHmiStore.getState().availableOrders).toEqual(ORDENES);
    expect(useHmiStore.getState().isLoadingOrders).toBe(false);
  });

  it('sin red y sin copia, la lista queda vacía sin errores', async () => {
    vi.mocked(localDb.snapshots.get).mockResolvedValue(undefined as never);
    useHmiStore.setState({ isOnline: false });

    await useHmiStore.getState().loadAvailableOrders();

    expect(useHmiStore.getState().availableOrders).toEqual([]);
  });

  it('la orden abierta también se guarda y se recupera sin red', async () => {
    const orden = { id: 'ord-cache', status: 'in_progress', quantity: 100 };
    vi.mocked(callApiWithTimeout).mockResolvedValue(orden as never);

    await useHmiStore.getState().loadOrder('ord-cache');

    expect(useHmiStore.getState().activeOrder).toEqual(orden);
    const guardado = vi.mocked(localDb.snapshots.put).mock.calls[0][0] as { id: string };
    expect(guardado.id).toBe('orden:ord-cache');

    // Y sin red se recupera la misma orden.
    vi.clearAllMocks();
    vi.mocked(localDb.snapshots.get).mockResolvedValue({ id: 'orden:ord-cache', payload: orden } as never);
    useHmiStore.setState({ isOnline: false, activeOrder: null, currentStatus: 'pending' });

    await useHmiStore.getState().loadOrder('ord-cache');

    expect(useHmiStore.getState().activeOrder).toEqual(orden);
    expect(useHmiStore.getState().currentStatus).toBe('in_progress');
  });
});
