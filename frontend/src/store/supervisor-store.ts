import { create } from 'zustand';
import {
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  fetchManufacturingModels,
  fetchWorkstations,
  fetchOrderActivity,
  fetchWorkstationsStatus,
  type Order,
  type ManufacturingModel,
  type Workstation,
  type ActivityBlock,
} from '../api/supervisor.js';

interface SupervisorState {
  orders: Order[];
  models: ManufacturingModel[];
  workstations: Workstation[];
  workstationStatus: Workstation[];
  activity: ActivityBlock[];
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;

  loadOrders: () => Promise<void>;
  loadModels: () => Promise<void>;
  loadWorkstations: () => Promise<void>;
  loadWorkstationStatus: () => Promise<void>;
  loadOrderActivity: (orderId: string) => Promise<void>;
  addOrder: (data: { model_id: string; workstation_id: string; quantity: number; custom_fields?: Record<string, unknown> }) => Promise<void>;
  changeOrderStatus: (orderId: string, status: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const useSupervisorStore = create<SupervisorState>((set, get) => ({
  orders: [],
  models: [],
  workstations: [],
  workstationStatus: [],
  activity: [],
  isLoading: false,
  error: null,
  isPolling: false,

  loadOrders: async () => {
    try {
      const orders = await fetchOrders();
      set({ orders });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error loading orders' });
    }
  },

  loadModels: async () => {
    try {
      const models = await fetchManufacturingModels();
      set({ models });
    } catch (err) {
      console.error('Error loading models:', err);
    }
  },

  loadWorkstations: async () => {
    try {
      const workstations = await fetchWorkstations();
      set({ workstations });
    } catch (err) {
      console.error('Error loading workstations:', err);
    }
  },

  loadWorkstationStatus: async () => {
    try {
      const workstationStatus = await fetchWorkstationsStatus();
      set({ workstationStatus });
    } catch (err) {
      console.error('Error loading workstation status:', err);
    }
  },

  loadOrderActivity: async (orderId: string) => {
    try {
      const activity = await fetchOrderActivity(orderId);
      set({ activity });
    } catch (err) {
      console.error('Error loading activity:', err);
    }
  },

  addOrder: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await createOrder(data);
      const orders = await fetchOrders();
      set({ orders, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error creating order', isLoading: false });
    }
  },

  changeOrderStatus: async (orderId, status) => {
    set({ isLoading: true, error: null });
    try {
      await updateOrder(orderId, { status });
      const orders = await fetchOrders();
      set({ orders, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error updating order', isLoading: false });
    }
  },

  removeOrder: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteOrder(orderId);
      const orders = await fetchOrders();
      set({ orders, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error deleting order', isLoading: false });
    }
  },

  startPolling: () => {
    if (pollingInterval) return;
    set({ isPolling: true });
    pollingInterval = setInterval(() => {
      void get().loadOrders();
      void get().loadWorkstationStatus();
    }, 10000);
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    set({ isPolling: false });
  },
}));
