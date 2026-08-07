import { useEffect, useState } from 'react';
import { useSupervisorStore } from '../store/supervisor-store.js';

export type SupervisorTab = 'orders' | 'workstations';

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
  // Acciones
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleToggleExpand: (orderId: string) => void;
  changeOrderStatus: (orderId: string, status: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
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
    handleSubmit,
    handleToggleExpand,
    changeOrderStatus: store.changeOrderStatus,
    removeOrder: store.removeOrder,
    loadOrders: store.loadOrders,
  };
}
