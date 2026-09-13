import { useHmiStore } from './hmi-store';

/**
 * Selectors for the Hmi Zustand store.
 * Using these selectors ensures components only re-render when the selected slice changes.
 */

export const useCapabilities = () => useHmiStore(state => state.capabilities);
export const useAvailableOrders = () => useHmiStore(state => state.availableOrders);
export const useIsLoadingOrders = () => useHmiStore(state => state.isLoadingOrders);
export const useSelectedOrderCustomFields = () => useHmiStore(state => state.selectedOrderCustomFields);
export const useActiveOrder = () => useHmiStore(state => state.activeOrder);
export const useCurrentStatus = () => useHmiStore(state => state.currentStatus);
export const useOperatorId = () => useHmiStore(state => state.operatorId);
export const useWorkstationId = () => useHmiStore(state => state.workstationId);
export const useIsOnline = () => useHmiStore(state => state.isOnline);
export const usePendingCount = () => useHmiStore(state => state.pendingCount);
export const useFailedCount = () => useHmiStore(state => state.failedCount);
export const useIsMutating = () => useHmiStore(state => state.isMutating);
export const useIsSyncing = () => useHmiStore(state => state.isSyncing);
export const useTenantId = () => useHmiStore(state => state.tenantId);
export const useUserId = () => useHmiStore(state => state.userId);
export const useRole = () => useHmiStore(state => state.role);

/**
 * Action selectors (including setters) for the Hmi Zustand store.
 * These return the functions that can be called to update state or perform actions.
 */

export const useSetOnlineStatus = () => useHmiStore(state => state.setOnlineStatus);
export const useSetPendingCount = () => useHmiStore(state => state.setPendingCount);
export const useSetFailedCount = () => useHmiStore(state => state.setFailedCount);
export const useLoadCapabilities = () => useHmiStore(state => state.loadCapabilities);
export const useLoadOperatorContext = () => useHmiStore(state => state.loadOperatorContext);
export const useLoadAvailableOrders = () => useHmiStore(state => state.loadAvailableOrders);
export const useSelectOrder = () => useHmiStore(state => state.selectOrder);
export const useLoadOrder = () => useHmiStore(state => state.loadOrder);
export const useUpdateCustomFields = () => useHmiStore(state => state.updateCustomFields);