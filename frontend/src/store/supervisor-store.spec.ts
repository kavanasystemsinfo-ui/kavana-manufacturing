import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock API module before importing store
vi.mock('../api/supervisor.js', () => ({
  fetchOrders: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  fetchManufacturingModels: vi.fn(),
  fetchWorkstations: vi.fn(),
  fetchOrderActivity: vi.fn(),
  fetchWorkstationsStatus: vi.fn(),
}));

import { useSupervisorStore } from './supervisor-store.js';
import * as api from '../api/supervisor.js';

describe('SupervisorStore (Zustand)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSupervisorStore.setState({
      orders: [],
      models: [],
      workstations: [],
      workstationStatus: [],
      activity: [],
      isLoading: false,
      error: null,
      isPolling: false,
    });
  });

  it('loadOrders fetches and sets orders', async () => {
    const mockOrders = [{ id: 'o1', code: 'ORD-001', status: 'active' }];
    vi.mocked(api.fetchOrders).mockResolvedValue(mockOrders as any);

    await useSupervisorStore.getState().loadOrders();
    expect(useSupervisorStore.getState().orders).toEqual(mockOrders);
  });

  it('loadOrders sets error on failure', async () => {
    vi.mocked(api.fetchOrders).mockRejectedValue(new Error('Network error'));

    await useSupervisorStore.getState().loadOrders();
    expect(useSupervisorStore.getState().error).toBe('Network error');
  });

  it('addOrder creates order and refreshes list', async () => {
    const mockOrders = [{ id: 'o2', code: 'ORD-002', status: 'active' }];
    vi.mocked(api.createOrder).mockResolvedValue(undefined);
    vi.mocked(api.fetchOrders).mockResolvedValue(mockOrders as any);

    await useSupervisorStore.getState().addOrder({ model_id: 'm1', workstation_id: 'w1', quantity: 100 });
    expect(api.createOrder).toHaveBeenCalledWith({ model_id: 'm1', workstation_id: 'w1', quantity: 100 });
    expect(useSupervisorStore.getState().orders).toEqual(mockOrders);
  });

  it('startPolling sets isPolling to true', () => {
    useSupervisorStore.getState().startPolling();
    expect(useSupervisorStore.getState().isPolling).toBe(true);
  });

  it('stopPolling sets isPolling to false', () => {
    useSupervisorStore.getState().startPolling();
    useSupervisorStore.getState().stopPolling();
    expect(useSupervisorStore.getState().isPolling).toBe(false);
  });
});
