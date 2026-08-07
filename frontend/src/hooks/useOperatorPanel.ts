import { useEffect, useState } from 'react';
import { useHmiStore, triggerSyncEngine } from '../store/hmi-store.js';
import { mapCustomFieldsToUI } from '../utils/customFieldsMapper.js';

export interface OperatorPanelState {
  // HMI Store
  currentStatus: string;
  isOnline: boolean;
  isMutating: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  capabilities: any;
  orderId: any;
  workstationId: any;
  operatorId: any;
  activeOrder: any;
  registerWorkBlock: (...args: any) => any;
  // ... (keep all other store properties)
  loadCapabilities: () => Promise<void>;
  loadOperatorContext: () => Promise<void>;
  loadAvailableOrders: () => Promise<void>;
  selectOrder: (...args: any) => any;
  loadOrder: (...args: any) => any;
  updateCustomFields: (orderId: string, fields: Record<string, any>) => Promise<void>;
  workstationName: any;
  operatorName: any;
  availableOrders: any[];
  isLoadingOrders: boolean;
  selectedOrderCustomFields: any;
  triggerSyncEngine: () => Promise<void>;
  // Local state
  isFailedLogsModalOpen: boolean;
  setIsFailedLogsModalOpen: (v: boolean) => void;
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  producedQuantity: string;
  setProducedQuantity: (v: string) => void;
  defectQuantity: string;
  setDefectQuantity: (v: string) => void;
  observations: string;
  setObservations: (v: string) => void;
  errorMsg: string;
  setErrorMsg: (v: string) => void;
  editingCustomFields: Record<string, any>;
  setEditingCustomFields: (v: Record<string, any>) => void;
  isSavingCustomFields: boolean;
  // Handlers
  handleTimeChange: (val: string, setter: (v: string) => void) => void;
  handleRegisterBlock: (e: React.FormEvent) => Promise<void>;
  handleSaveCustomFields: () => Promise<void>;
  // Derived
  schemaFields: any[];
  customFields: any[];
  filteredOrders: any[];
  activeOrderCustomFields: any;
}

export function useOperatorPanel(): OperatorPanelState {
  const hmi = useHmiStore();

  const [isFailedLogsModalOpen, setIsFailedLogsModalOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [producedQuantity, setProducedQuantity] = useState('');
  const [defectQuantity, setDefectQuantity] = useState('0');
  const [observations, setObservations] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingCustomFields, setEditingCustomFields] = useState<Record<string, any>>({});
  const [isSavingCustomFields, setIsSavingCustomFields] = useState(false);

  useEffect(() => {
    void hmi.loadOperatorContext();
    void hmi.loadCapabilities();
    void hmi.loadAvailableOrders();
    void triggerSyncEngine();
  }, []);

  useEffect(() => {
    if (hmi.orderId) void hmi.loadOrder(hmi.orderId);
  }, [hmi.orderId]);

  useEffect(() => {
    if (hmi.activeOrder?.custom_fields) {
      setEditingCustomFields({ ...hmi.activeOrder.custom_fields });
    }
  }, [hmi.activeOrder?.custom_fields]);

  const parseTimeStr = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const handleTimeChange = (val: string, setter: (v: string) => void) => {
    let clean = val.replace(/[^\d:]/g, '');
    if (clean.length === 2 && !clean.includes(':') && val.length === 2) clean += ':';
    else if (clean.length > 2 && !clean.includes(':')) clean = clean.slice(0, 2) + ':' + clean.slice(2);
    if (clean.length > 5) clean = clean.slice(0, 5);
    setter(clean);
  };

  const handleRegisterBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (startTime.length < 5 || endTime.length < 5) { setErrorMsg('Las horas deben tener formato HH:MM completo.'); return; }
    const startD = parseTimeStr(startTime);
    const endD = parseTimeStr(endTime);
    if (endD < startD) endD.setDate(endD.getDate() + 1);
    if (endD <= startD) { setErrorMsg('La hora de fin debe ser posterior a la de inicio.'); return; }
    if (!producedQuantity || Number(producedQuantity) < 0) { setErrorMsg('Debes introducir la cantidad producida.'); return; }
    await hmi.registerWorkBlock('produccion', startD.toISOString(), endD.toISOString(), null, Number(producedQuantity), Number(defectQuantity), observations.trim() || null);
    setStartTime(''); setEndTime(''); setProducedQuantity(''); setDefectQuantity('0'); setObservations('');
  };

  const handleSaveCustomFields = async () => {
    if (!hmi.orderId) return;
    setIsSavingCustomFields(true);
    try { await hmi.updateCustomFields(hmi.orderId, editingCustomFields); }
    finally { setIsSavingCustomFields(false); }
  };

  const activeOrderCustomFields = useHmiStore((s) => s.activeOrder?.custom_fields);
  const schemaFields = Array.isArray((hmi.capabilities?.customFieldsSchema as any)?.production_orders?.fields)
    ? (hmi.capabilities?.customFieldsSchema as any).production_orders.fields : [];
  const customFields = mapCustomFieldsToUI(activeOrderCustomFields, schemaFields);
  const filteredOrders = hmi.availableOrders.filter((o: any) => {
    const q = orderSearch.toLowerCase();
    return !q || o.model_name?.toLowerCase().includes(q) || o.workstation_name?.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
  });

  return {
    currentStatus: hmi.currentStatus,
    isOnline: hmi.isOnline,
    isMutating: hmi.isMutating,
    isSyncing: hmi.isSyncing,
    pendingCount: hmi.pendingCount,
    failedCount: hmi.failedCount,
    capabilities: hmi.capabilities,
    orderId: hmi.orderId,
    workstationId: hmi.workstationId,
    operatorId: hmi.operatorId,
    activeOrder: hmi.activeOrder,
    registerWorkBlock: hmi.registerWorkBlock,
    loadCapabilities: hmi.loadCapabilities,
    loadOperatorContext: hmi.loadOperatorContext,
    loadAvailableOrders: hmi.loadAvailableOrders,
    selectOrder: hmi.selectOrder,
    loadOrder: hmi.loadOrder,
    updateCustomFields: hmi.updateCustomFields,
    workstationName: hmi.workstationName,
    operatorName: hmi.operatorName,
    availableOrders: hmi.availableOrders,
    isLoadingOrders: hmi.isLoadingOrders,
    selectedOrderCustomFields: hmi.selectedOrderCustomFields,
    triggerSyncEngine: triggerSyncEngine,
    isFailedLogsModalOpen, setIsFailedLogsModalOpen,
    orderSearch, setOrderSearch,
    startTime, setStartTime, endTime, setEndTime,
    producedQuantity, setProducedQuantity,
    defectQuantity, setDefectQuantity,
    observations, setObservations,
    errorMsg, setErrorMsg,
    editingCustomFields, setEditingCustomFields,
    isSavingCustomFields,
    handleTimeChange, handleRegisterBlock, handleSaveCustomFields,
    schemaFields, customFields, filteredOrders, activeOrderCustomFields,
  };
}
