import { create } from 'zustand';
import { localDb, type OfflineWorkBlock } from '../db/local-db.js';
import { callApiWithTimeout } from '../api/client.js';
import { fetchCapabilities, type TenantCapabilities } from '../api/admin.js';

export type ProductionStatus = 'pending' | 'in_progress' | 'completed';

export interface ProductionOrder {
  id: string;
  status: ProductionStatus;
  custom_fields?: Record<string, any>;
  [key: string]: any;
}

export interface AvailableOrder {
  id: string;
  model_id: string;
  workstation_id: string;
  quantity: number;
  status: 'pending' | 'in_progress';
  created_by: string;
  custom_fields: Record<string, any>;
  model_name: string | null;
  workstation_name: string | null;
  created_at: string;
  updated_at: string;
}

interface HmiState {
  currentStatus: ProductionStatus;
  activeOrder: ProductionOrder | null;
  isOnline: boolean;
  isMutating: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  
  // Decoded multi-tenant info
  tenantId: string;
  userId: string;
  role: string;
  
  // Operator context (loaded from API or URL params)
  orderId: string | null;
  workstationId: string | null;
  workstationName: string | null;
  operatorId: string | null;
  operatorName: string | null;
  
  // Available orders for selection
  availableOrders: AvailableOrder[];
  isLoadingOrders: boolean;
  selectedOrderCustomFields: Record<string, any> | null;
  
  // Current tenant governance capabilities (cached offline in Dexie)
  capabilities: TenantCapabilities | null;

  setOnlineStatus: (status: boolean) => void;
  setPendingCount: (count: number) => void;
  setFailedCount: (count: number) => void;
  loadCapabilities: () => Promise<void>;
  loadOperatorContext: () => Promise<void>;
  loadAvailableOrders: () => Promise<void>;
  selectOrder: (order: AvailableOrder) => void;
  registerWorkBlock: (
    type: 'produccion' | 'parada',
    startTime: string,
    endTime: string,
    reason?: string | null,
    producedQuantity?: number,
    defectQuantity?: number,
  ) => Promise<void>;
  loadOrder: (orderId: string) => Promise<void>;
  updateCustomFields: (orderId: string, customFields: Record<string, any>) => Promise<void>;
}

function getTenantContextFromToken(): { tenantId: string; userId: string; role: string } {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { tenantId: '1', userId: 'admin-dev-01', role: 'tenant_admin' };
  }
  const token = localStorage.getItem('kavana_dev_token');
  if (!token || token === 'mock-token') {
    return { tenantId: '1', userId: 'admin-dev-01', role: 'tenant_admin' };
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const tenantId = String(payload.tenant_id ?? payload['custom:tenant_id'] ?? '1');
      const userId = String(payload.sub ?? 'unknown-user');
      const role = String(payload.role ?? payload['custom:role'] ?? 'operario');
      return { tenantId, userId, role };
    }
  } catch (e) {
    // Fallback if parsing fails
  }
  return { tenantId: '1', userId: 'unknown-user', role: 'operario' };
}

function generateClientEventId() {
  // Generar UUID v4 compatible con cualquier navegador
  const hex = '0123456789abcdef';
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return c === 'x' ? hex[r] : hex[(r & 0x3) | 0x8];
  });
  return uuid;
}

function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('kavana_device_id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('kavana_device_id', deviceId);
    }
    return deviceId;
  } catch {
    return `device-${Date.now()}`;
  }
}

async function loadQueueCounters() {
  await useHmiStore.getState().setPendingCount(await localDb.offlineBlocks.count());
  await useHmiStore.getState().setFailedCount(await localDb.failedBlocks.count());
}

const initialContext = getTenantContextFromToken();

export const useHmiStore = create<HmiState>()((set, get) => ({
  currentStatus: 'pending',
  activeOrder: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isMutating: false,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  
  tenantId: initialContext.tenantId,
  userId: initialContext.userId,
  role: initialContext.role,
  orderId: null,
  workstationId: null,
  workstationName: null,
  operatorId: null,
  operatorName: null,
  availableOrders: [],
  isLoadingOrders: false,
  selectedOrderCustomFields: null,
  capabilities: null,

  setOnlineStatus: (status) => set({ isOnline: status }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setFailedCount: (count) => set({ failedCount: count }),

  loadCapabilities: async () => {
    const activeTenantId = get().tenantId;
    try {
      const caps = await fetchCapabilities();
      
      // Persist immediately in Dexie
      await localDb.tenantConfig.put({
        tenantId: caps.tenantId,
        governanceVersion: caps.governanceVersion,
        modules: caps.modules,
        quotas: caps.quotas,
        customFieldsSchema: caps.customFieldsSchema,
        updatedAt: new Date().toISOString(),
      });
      
      set({ capabilities: caps });
    } catch (error) {
      console.warn('Failed to fetch capabilities online, loading from Dexie:', error);
      const cached = await localDb.tenantConfig.get(activeTenantId);
      if (cached) {
        set({
          capabilities: {
            tenantId: cached.tenantId,
            governanceVersion: cached.governanceVersion,
            modules: cached.modules,
            quotas: cached.quotas,
            customFieldsSchema: cached.customFieldsSchema,
          },
        });
      }
    }
  },

  loadOperatorContext: async () => {
    // Try to load context from URL params first (kiosk mode)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlOrderId = params.get('order_id');
      const urlWorkstationId = params.get('workstation_id');
      const urlOperatorId = params.get('operator_id');
      
      if (urlOrderId && urlWorkstationId && urlOperatorId) {
        set({ orderId: urlOrderId, workstationId: urlWorkstationId, operatorId: urlOperatorId });
        return;
      }
    }
    
    // Fallback: try to fetch from API
    if (get().isOnline) {
      try {
        const data = await callApiWithTimeout<{ operatorId: string; operatorName: string | null; workstationId: string | null; workstationName: string | null }>(
          '/production/operator/context'
        );
        if (data?.operatorId) {
          set({
            operatorId: data.operatorId,
            operatorName: data.operatorName ?? null,
            workstationId: data.workstationId ?? get().workstationId,
            workstationName: data.workstationName ?? null,
          });
          return;
        }
      } catch {
        // API endpoint not available yet
      }
    }
    
    // Last fallback: use userId as operatorId (minimum viable context)
    const state = get();
    if (!state.operatorId) {
      set({ operatorId: state.userId });
    }
  },

  loadAvailableOrders: async () => {
    if (!get().isOnline) return;
    set({ isLoadingOrders: true });
    try {
      const orders = await callApiWithTimeout<AvailableOrder[]>('/api/orders/available');
      set({ availableOrders: orders ?? [] });
    } catch (error) {
      console.warn('Failed to load available orders:', error);
      set({ availableOrders: [] });
    } finally {
      set({ isLoadingOrders: false });
    }
  },

  selectOrder: (order: AvailableOrder) => {
    set({
      orderId: order.id,
      workstationId: order.workstation_id,
      workstationName: order.workstation_name ?? get().workstationName,
      selectedOrderCustomFields: order.custom_fields ?? {},
    });
  },

  loadOrder: async (orderId: string) => {
    if (!get().isOnline) return;
    try {
      const order = await callApiWithTimeout<any>(`/production/orders/${orderId}`);
      if (order && order.status) {
        set({ 
          currentStatus: order.status as ProductionStatus,
          activeOrder: order
        });
      }
    } catch (error) {
      console.warn('Failed to load real order status from backend:', error);
    }
  },

  updateCustomFields: async (orderId: string, customFields: Record<string, any>) => {
    if (!get().isOnline) return;
    try {
      const updatedOrder = await callApiWithTimeout<any>(`/production/orders/${orderId}/custom-fields`, {
        method: 'PATCH',
        body: JSON.stringify({ custom_fields: customFields }),
      });
      if (updatedOrder && updatedOrder.id) {
        set({ activeOrder: updatedOrder });
      }
    } catch (error) {
      console.warn('Failed to update custom fields:', error);
    }
  },

  registerWorkBlock: async (type, startTime, endTime, reason, producedQuantity, defectQuantity) => {
    set({ isMutating: true });

    const state = get();
    const orderId = state.orderId;
    const workstationId = state.workstationId;
    const operatorId = state.operatorId;

    if (!orderId || !workstationId || !operatorId) {
      console.error('Cannot register work block: missing operator context (orderId, workstationId, or operatorId)');
      set({ isMutating: false });
      return;
    }

    const block: OfflineWorkBlock = {
      id: generateClientEventId(),
      tenant_id: state.tenantId,
      order_id: orderId,
      workstation_id: workstationId,
      operator_id: operatorId,
      type,
      start_time: startTime,
      end_time: endTime,
      downtime_reason: reason ?? null,
      produced_quantity: producedQuantity,
      defect_quantity: defectQuantity,
      is_offline_event: !state.isOnline,
      client_device_id: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown-device',
      version: 1,                            // NUEVO: versión inicial
      device_id: getDeviceId(),               // NUEVO: ID único del dispositivo
    };

    try {
      await localDb.offlineBlocks.add(block);
      // Actualizamos estado local optimista
      set({ currentStatus: 'in_progress' });
      await loadQueueCounters();
    } finally {
      set({ isMutating: false });
    }
    
    // Call triggerSyncEngine AFTER isMutating is set to false
    void triggerSyncEngine();
  },
}));

export async function triggerSyncEngine() {
  const state = useHmiStore.getState();

  if (!state.isOnline || state.isMutating || state.isSyncing) {
    return;
  }

  useHmiStore.setState({ isSyncing: true });

  try {
    let oldestBlock = await localDb.offlineBlocks.orderBy('start_time').first();

    while (oldestBlock) {
      if (!oldestBlock) {
        break;
      }

      try {
        await callApiWithTimeout('/production/time-logs/sync', {
          method: 'POST',
          body: JSON.stringify(oldestBlock),
        });

        await localDb.offlineBlocks.delete(oldestBlock.id);
        oldestBlock = await localDb.offlineBlocks.orderBy('start_time').first();
      } catch (error) {
        const failedBlock = oldestBlock!;

        await localDb.failedBlocks.put({
          id: failedBlock.id,
          tenant_id: failedBlock.tenant_id,
          order_id: failedBlock.order_id,
          workstation_id: failedBlock.workstation_id,
          operator_id: failedBlock.operator_id,
          type: failedBlock.type,
          start_time: failedBlock.start_time,
          end_time: failedBlock.end_time,
          downtime_reason: failedBlock.downtime_reason,
          produced_quantity: failedBlock.produced_quantity,
          defect_quantity: failedBlock.defect_quantity,
          is_offline_event: failedBlock.is_offline_event,
          client_device_id: failedBlock.client_device_id,
          version: failedBlock.version ?? 1,
          device_id: failedBlock.device_id ?? 'unknown',
          error: error instanceof Error ? error.message : String(error),
        });
        await localDb.offlineBlocks.delete(failedBlock.id);
        break;
      }
    }
  } finally {
    useHmiStore.setState({ isSyncing: false });
    await loadQueueCounters();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useHmiStore.getState().setOnlineStatus(true);
    void triggerSyncEngine();
  });

  window.addEventListener('offline', () => {
    useHmiStore.getState().setOnlineStatus(false);
  });
}
