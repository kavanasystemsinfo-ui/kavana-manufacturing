import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHmiStore } from './hmi-store.js';
import { localDb } from '../db/local-db.js';

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
