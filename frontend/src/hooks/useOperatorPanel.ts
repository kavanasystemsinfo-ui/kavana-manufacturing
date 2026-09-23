import { useEffect, useState } from 'react';
import { useHmiStore, triggerSyncEngine } from '../store/hmi-store.js';
import { mapCustomFieldsToUI } from '../utils/customFieldsMapper.js';
import { buildPayload } from '../utils/custom-field-values.js';
import {
  useStartTime,
  useSetStartTime,
  useEndTime,
  useSetEndTime,
  useProducedQuantity,
  useSetProducedQuantity,
  useDefectQuantity,
  useSetDefectQuantity,
  useObservations,
  useSetObservations,
  useRepeatLastBlock,
  useLastBlock,
  useSetLastBlock,
  useCalculateShiftKPI,
} from '../store/operator-panel-store.js';
import type { LastBlock, ShiftKPI } from '../store/operator-panel-store.js';

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
  assignedWorkstationName: string | null;
  selectedOrderCustomFields: any;
  triggerSyncEngine: () => Promise<void>;
  // Local state (from operator-panel-store)
  isFailedLogsModalOpen: boolean;
  setIsFailedLogsModalOpen: (v: boolean) => void;
  isIncidenciaModalOpen: boolean;
  setIsIncidenciaModalOpen: (v: boolean) => void;
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
  
  // New: last block & KPI
  lastBlock: LastBlock | null;
  repeatLastBlock: () => void;
  calculateShiftKPI: (blocks: any[]) => ShiftKPI;
  // Handlers
  handleRegisterBlock: (e: React.FormEvent) => Promise<void>;
  handleSaveCustomFields: () => Promise<boolean | undefined>;
  // Derived
  schemaFields: any[];
  customFields: any[];
  filteredOrders: any[];
  activeOrderCustomFields: any;
}

/**
 * Valida las horas de un bloque de trabajo introducidas con input type="time".
 * El navegador ya garantiza formato HH:MM; esto valida presencia, formato
 * (defensa contra navegadores sin soporte) y orden temporal con cruce de
 * medianoche permitido (turnos nocturnos).
 */
export function validateWorkBlockTimes(start: string, end: string): string | null {
  if (!start || !end) return 'Las horas de inicio y fin son obligatorias.';
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return 'Las horas deben tener formato HH:MM completo.';
  }
  if (start === end) return 'La hora de fin debe ser posterior a la de inicio.';
  return null;
}

export function useOperatorPanel(): OperatorPanelState {
  const hmi = useHmiStore();

  // New store selectors
  const startTime = useStartTime();
  const setStartTime = useSetStartTime();
  const endTime = useEndTime();
  const setEndTime = useSetEndTime();
  const producedQuantity = useProducedQuantity();
  const setProducedQuantity = useSetProducedQuantity();
  const defectQuantity = useDefectQuantity();
  const setDefectQuantity = useSetDefectQuantity();
  const observations = useObservations();
  const setObservations = useSetObservations();
  const repeatLastBlock = useRepeatLastBlock();
  const lastBlock = useLastBlock();
  const setLastBlock = useSetLastBlock();
  const calculateShiftKPI = useCalculateShiftKPI();

  const [isFailedLogsModalOpen, setIsFailedLogsModalOpen] = useState(false);
  const [isIncidenciaModalOpen, setIsIncidenciaModalOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  // Puesto asignado AL USUARIO (no el de la orden activa, que es lo que guarda el
  // store). Llega del login porque el endpoint /production/operator/context que
  // intentaba usar el store no existe todavía: sin este dato el panel no puede
  // distinguir «no tengo puesto» de «no tengo trabajo».
  const [assignedWorkstationName] = useState<string | null>(() => localStorage.getItem('kavana_workstation_name'));
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

  const handleRegisterBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const timeError = validateWorkBlockTimes(startTime, endTime);
    if (timeError) { setErrorMsg(timeError); return; }
    const startD = parseTimeStr(startTime);
    const endD = parseTimeStr(endTime);
    if (endD < startD) endD.setDate(endD.getDate() + 1);
    if (endD <= startD) { setErrorMsg('La hora de fin debe ser posterior a la de inicio.'); return; }
    if (!producedQuantity || Number(producedQuantity) < 0) { setErrorMsg('Debes introducir la cantidad producida.'); return; }
    await hmi.registerWorkBlock('produccion', startD.toISOString(), endD.toISOString(), null, Number(producedQuantity), Number(defectQuantity), observations.trim() || null);
    
    // Guardar último bloque para "Repetir"
    setLastBlock({
      startTime,
      endTime,
      producedQuantity: Number(producedQuantity),
      defectQuantity: Number(defectQuantity),
      observations: observations.trim(),
    });
    
    setStartTime(''); setEndTime(''); setProducedQuantity(''); setDefectQuantity('0'); setObservations('');
  };

  const handleSaveCustomFields = async () => {
    if (!hmi.orderId) return;
    setIsSavingCustomFields(true);
    try {
      // Los controles del formulario devuelven texto, así que se convierte cada
      // valor al tipo que declara el esquema antes de mandarlo: un número como
      // "3" lo rechaza el backend. Los campos vacíos no se envían.
      await hmi.updateCustomFields(hmi.orderId, buildPayload(schemaFields, editingCustomFields));
      setErrorMsg('');
      return true;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudieron guardar los campos');
      return false;
    } finally {
      setIsSavingCustomFields(false);
    }
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
    assignedWorkstationName,
    selectedOrderCustomFields: hmi.selectedOrderCustomFields,
    triggerSyncEngine: triggerSyncEngine,
    isFailedLogsModalOpen, setIsFailedLogsModalOpen,
    isIncidenciaModalOpen, setIsIncidenciaModalOpen,
    orderSearch, setOrderSearch,
    startTime, setStartTime, endTime, setEndTime,
    producedQuantity, setProducedQuantity,
    defectQuantity, setDefectQuantity,
    observations, setObservations,
    errorMsg, setErrorMsg,
    editingCustomFields, setEditingCustomFields,
    isSavingCustomFields,
    handleRegisterBlock, handleSaveCustomFields,
    schemaFields, customFields, filteredOrders, activeOrderCustomFields,
    // New
    lastBlock,
    repeatLastBlock,
    calculateShiftKPI,
  };
}
