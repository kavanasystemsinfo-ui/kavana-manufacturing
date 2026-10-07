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
import type { WorkstationLive } from '../components/WorkstationBoard.js';
import {
  DEFAULT_ORDER_FILTERS,
  type OrderFilters,
} from '../utils/order-filters.js';
import {
  DEMO_DELETE_NOTICE,
  DEMO_MOVE_NOTICE,
  ORDER_CREATED_NOTICE,
  isDemoReadOnlyError,
  orderMoveNotice,
} from '../utils/demo-readonly.js';

interface SupervisorState {
  orders: Order[];
  models: ManufacturingModel[];
  workstations: Workstation[];
  workstationStatus: WorkstationLive[];
  activity: ActivityBlock[];
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  /** Filtros aplicados en el servidor: son los mismos para los dos temas. */
  filters: OrderFilters;
  /** Quedan órdenes por traer con los filtros actuales. */
  hasMore: boolean;
  /** Aviso neutro (movimiento hecho, o movimiento que la demo no guarda). */
  notice: string | null;

  loadOrders: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  setFilters: (patch: Partial<OrderFilters>) => void;
  clearNotice: () => void;
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
  filters: { ...DEFAULT_ORDER_FILTERS },
  hasMore: false,
  notice: null,

  loadOrders: async () => {
    try {
      const filters = get().filters;
      const orders = await fetchOrders(filters);
      set({ orders, hasMore: orders.length >= filters.limit });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error loading orders' });
    }
  },

  loadMoreOrders: async () => {
    const { filters, orders } = get();
    try {
      const siguiente = await fetchOrders({ ...filters, offset: orders.length });
      set({
        orders: [...orders, ...siguiente],
        hasMore: siguiente.length >= filters.limit,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error loading orders' });
    }
  },

  setFilters: (patch) => {
    set({ filters: { ...get().filters, ...patch } });
    void get().loadOrders();
  },

  clearNotice: () => set({ notice: null }),

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
    set({ isLoading: true, error: null, notice: null });
    try {
      await createOrder(data);
      const orders = await fetchOrders(get().filters);
      set({ orders, isLoading: false, notice: ORDER_CREATED_NOTICE });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error creating order', isLoading: false });
    }
  },

  /**
   * Cambio de estado. La tarjeta se recoloca al soltarla (movimiento optimista)
   * en vez de esperar a la red: en una pantalla de planta el gesto tiene que
   * responder al instante. Si el backend lo rechaza por el blindaje de la demo,
   * no es un error del usuario: se avisa en neutro y se recarga el estado real.
   */
  changeOrderStatus: async (orderId, status) => {
    const previas = get().orders;
    const movida = previas.find((o) => o.id === orderId);
    set({
      error: null,
      notice: null,
      orders: previas.map((o) =>
        o.id === orderId ? { ...o, status: status as Order['status'] } : o
      ),
    });
    try {
      await updateOrder(orderId, { status });
      const orders = await fetchOrders(get().filters);
      set({ orders, notice: orderMoveNotice(movida?.code, status) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating order';
      if (isDemoReadOnlyError(message)) {
        // El gesto es válido; lo que no persiste es el cambio.
        set({ orders: previas, notice: DEMO_MOVE_NOTICE });
      } else {
        set({ orders: previas, error: message });
      }
    }
  },

  removeOrder: async (orderId) => {
    set({ error: null, notice: null });
    try {
      await deleteOrder(orderId);
      const orders = await fetchOrders(get().filters);
      set({ orders });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting order';
      set(isDemoReadOnlyError(message) ? { notice: DEMO_DELETE_NOTICE } : { error: message });
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