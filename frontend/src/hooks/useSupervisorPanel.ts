import { useEffect, useState } from 'react';
import { useSupervisorStore } from '../store/supervisor-store.js';
import { listIncidencias, updateIncidencia, deleteIncidencia } from '../api/admin-entities.js';
import type { Incidencia } from '../api/admin-entities.js';

export type SupervisorTab = 'orders' | 'workstations' | 'incidencias';

export interface SupervisorPanelState {
  // Estado del store (Zustand)
  orders: ReturnType<typeof useSupervisorStore.getState>['orders'];
  models: ReturnType<typeof useSupervisorStore.getState>['models'];
  workstations: ReturnType<typeof useSupervisorStore.getState>['workstations'];
  workstationStatus: ReturnType<typeof useSupervisorStore.getState>['workstationStatus'];
  activity: ReturnType<typeof useSupervisorStore.getState>['activity'];
  isLoading: boolean;
  error: string | null;
  // Estado local
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  selectedWorkstation: string;
  setSelectedWorkstation: (v: string) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  orderNumber: string;
  setOrderNumber: (v: string) => void;
  measurement: string;
  setMeasurement: (v: string) => void;
  material: string;
  setMaterial: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  activeTab: SupervisorTab;
  setActiveTab: (v: SupervisorTab) => void;
  expandedOrder: string | null;
  setExpandedOrder: (v: string | null) => void;
  // Incidencias
  incidencias: Incidencia[];
  incidenciasLoading: boolean;
  incidenciasError: string | null;
  // Acciones
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleToggleExpand: (orderId: string) => void;
  changeOrderStatus: (orderId: string, status: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
  changeIncidenciaStatus: (id: string, status: string) => Promise<void>;
  removeIncidencia: (id: string) => Promise<void>;
  loadOrders: () => Promise<void>;
}

export function useSupervisorPanel(): SupervisorPanelState {
  const store = useSupervisorStore();

  const [showForm, setShowForm] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedWorkstation, setSelectedWorkstation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [measurement, setMeasurement] = useState('');
  const [material, setMaterial] = useState('');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<SupervisorTab>('orders');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [incidenciasLoading, setIncidenciasLoading] = useState(false);
  const [incidenciasError, setIncidenciasError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'incidencias') return;
    let cancelled = false;
    setIncidenciasLoading(true);
    setIncidenciasError(null);
    listIncidencias()
      .then((data) => { if (!cancelled) setIncidencias(data); })
      .catch(() => { if (!cancelled) setIncidenciasError('Error al cargar incidencias'); })
      .finally(() => { if (!cancelled) setIncidenciasLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab]);

  // Carga inicial al montar: el contador de la pestaña debe ser real desde el
  // primer render (antes nacía en 0 y solo se rellenaba al entrar en la pestaña).
  useEffect(() => {
    let cancelled = false;
    setIncidenciasLoading(true);
    setIncidenciasError(null);
    listIncidencias()
      .then((data) => { if (!cancelled) setIncidencias(data); })
      .catch(() => { if (!cancelled) setIncidenciasError('Error al cargar incidencias'); })
      .finally(() => { if (!cancelled) setIncidenciasLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    void store.loadOrders();
    void store.loadModels();
    void store.loadWorkstations();
    void store.loadWorkstationStatus();
    store.startPolling();
    return () => store.stopPolling();
  }, []);

  useEffect(() => {
    if (expandedOrder) {
      void store.loadOrderActivity(expandedOrder);
    }
  }, [expandedOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !selectedWorkstation || !quantity) return;
    await store.addOrder({
      model_id: selectedModel,
      workstation_id: selectedWorkstation,
      quantity: Number(quantity),
      custom_fields: {
        ...(orderNumber ? { numero_orden: orderNumber } : {}),
        ...(measurement ? { medida: measurement } : {}),
        ...(material ? { material } : {}),
        ...(notes ? { notas: notes } : {}),
      },
    });
    setSelectedModel('');
    setSelectedWorkstation('');
    setQuantity('');
    setOrderNumber('');
    setMeasurement('');
    setMaterial('');
    setNotes('');
    setShowForm(false);
  };

  const handleToggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const reloadIncidencias = async () => {
    try {
      const data = await listIncidencias();
      setIncidencias(data);
      setIncidenciasError(null);
    } catch {
      setIncidenciasError('Error al recargar incidencias');
    }
  };

  const changeIncidenciaStatus = async (id: string, status: string) => {
    try {
      await updateIncidencia(id, { status });
      await reloadIncidencias();
    } catch {
      setIncidenciasError('No se pudo cambiar el estado de la incidencia');
    }
  };

  const removeIncidencia = async (id: string) => {
    try {
      await deleteIncidencia(id);
      await reloadIncidencias();
    } catch {
      setIncidenciasError('No se pudo eliminar la incidencia');
    }
  };

  return {
    orders: store.orders,
    models: store.models,
    workstations: store.workstations,
    workstationStatus: store.workstationStatus,
    activity: store.activity,
    isLoading: store.isLoading,
    error: store.error,
    showForm, setShowForm,
    selectedModel, setSelectedModel,
    selectedWorkstation, setSelectedWorkstation,
    quantity, setQuantity,
    orderNumber, setOrderNumber,
    measurement, setMeasurement,
    material, setMaterial,
    notes, setNotes,
    activeTab, setActiveTab,
    expandedOrder, setExpandedOrder,
    incidencias, incidenciasLoading, incidenciasError,
    handleSubmit,
    handleToggleExpand,
    changeOrderStatus: store.changeOrderStatus,
    removeOrder: store.removeOrder,
    changeIncidenciaStatus,
    removeIncidencia,
    loadOrders: store.loadOrders,
  };
}
