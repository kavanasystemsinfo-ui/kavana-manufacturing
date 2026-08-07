import { useEffect, useState, useCallback } from 'react';
import {
  listUsers, createUser, updateUser, deleteUser,
  listWorkstations, createWorkstation, updateWorkstation, deleteWorkstation,
  listManufacturingModels, createManufacturingModel, updateManufacturingModel, deleteManufacturingModel,
  listOrders,
  fetchCapabilities, toggleModuleCapability, updateCustomFieldsSchema,
  listToolings, createTooling, updateTooling, deleteTooling, incrementToolingByPieces,
  fetchToolingTypes, saveToolingTypes,
  listIncidencias, createIncidencia, updateIncidencia, deleteIncidencia, getIncidenciaStats,
  type User, type Workstation, type ManufacturingModel, type Order, type TenantCapabilities, type Tooling, type Incidencia, type IncidenciaStats,
} from './api/admin-entities.js';
import { useHmiStore } from './store/hmi-store.js';
import { HelpModal } from './components/HelpModal.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { OeeDashboard } from './components/OeeDashboard.js';
import { QualityDashboard } from './components/QualityDashboard.js';
import { CostDashboard } from './components/CostDashboard.js';
import { USERS_HELP, WORKSTATIONS_HELP, MODELS_HELP, ORDERS_HELP, MODULES_HELP, CUSTOM_FIELDS_HELP } from './help-content.js';


import { UsersTab } from './components/tabs/UsersTab.js';
import { WorkstationsTab } from './components/tabs/WorkstationsTab.js';
import { ModelsTab } from './components/tabs/ModelsTab.js';
import { OrdersTab } from './components/tabs/OrdersTab.js';
import { ModulesTab } from './components/tabs/ModulesTab.js';
import { CustomFieldsTab } from './components/tabs/CustomFieldsTab.js';
import { ToolingsTab } from './components/tabs/ToolingsTab.js';
import { IncidenciasTab } from './components/tabs/IncidenciasTab.js';
import { MaterialsTab } from './components/tabs/MaterialsTab.js';
type Tab = 'users' | 'workstations' | 'models' | 'orders' | 'modules' | 'custom-fields' | 'oee' | 'quality' | 'cost' | 'toolings' | 'incidencias' | 'materials';

interface EditableField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

export function ClassicAdminPanel() {
  const [tab, setTab] = useState<Tab>('users');
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);

  useEffect(() => {
    void fetchCapabilities().then(setCapabilities).catch(() => {});
  }, []);

  const isModuleEnabled = (key: string) => capabilities?.modules[key]?.enabled === true;

  const allTabs: { key: Tab; label: string; module?: string }[] = [
    { key: 'users', label: 'Usuarios' },
    { key: 'workstations', label: 'Puestos' },
    { key: 'models', label: 'Modelos' },
    { key: 'orders', label: 'Órdenes' },
    { key: 'toolings', label: 'Utillajes' },
    { key: 'incidencias', label: 'Incidencias' },
    { key: 'modules', label: 'Módulos' },
    { key: 'custom-fields', label: 'Campos' },
    { key: 'oee', label: 'OEE', module: 'oee_monitoring' },
    { key: 'quality', label: 'Calidad', module: 'quality_assurance' },
    { key: 'cost', label: 'Costes', module: 'cost_management' },
    { key: 'materials', label: 'Materias Primas', module: 'materials_management' },
  ];

  const tabs = allTabs.filter((t) => !t.module || isModuleEnabled(t.module));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      <header className="bg-kavana-dark text-white shadow-md sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-kavana-dark font-bold text-sm">KV</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-kavana-orange-light">Kavana Manufacturing HMI</p>
              <h1 className="text-lg font-semibold text-white">Panel de Administración</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
          <nav className="flex gap-0.5 bg-gray-800 rounded-md p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-kavana-orange text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="w-[90%] mx-auto px-4 py-5">
        {tab === 'users' && <UsersTab isClassic />}
        {tab === 'workstations' && <WorkstationsTab isClassic />}
        {tab === 'models' && <ModelsTab isClassic />}
        {tab === 'orders' && <OrdersTab isClassic />}
        {tab === 'toolings' && <ToolingsTab isClassic />}
        {tab === 'incidencias' && <IncidenciasTab isClassic />}
        {tab === 'modules' && <ModulesTab isClassic />}
        {tab === 'custom-fields' && <CustomFieldsTab isClassic />}
        {tab === 'oee' && <OeeDashboard />}
        {tab === 'quality' && <QualityDashboard />}
        {tab === 'cost' && <CostDashboard />}
        {tab === 'materials' && <MaterialsTab isClassic />}
      </main>
    </div>
  );
}

// ──── Shared inline-edit row style ────
const thStyle = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200';
const tdStyle = 'px-4 py-3 text-sm border-b border-gray-100';
const inputStyle = 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white text-gray-900';
const selectStyle = 'border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white';
const btnSm = 'text-xs font-medium px-2 py-1 rounded transition-colors';
const btnPrimary = `${btnSm} bg-kavana-orange text-white hover:bg-kavana-orange-light`;
const btnSuccess = `${btnSm} bg-green-600 text-white hover:bg-green-700`;
const btnDanger = `${btnSm} text-red-600 hover:text-red-800 hover:bg-red-50`;
const btnGhost = `${btnSm} text-gray-500 hover:text-gray-700 hover:bg-gray-100`;

// ──── Users Tab (V2 fields) ────
const operatorCategoryLabels: Record<string, string> = {
  peon_especialista: 'Peón Especialista',
  oficial_3: 'Oficial 3',
  oficial_2: 'Oficial 2',
  oficial_1: 'Oficial 1',
};

const roleLabels: Record<string, string> = { tenant_admin: 'Admin', supervisor: 'Supervisor', operario: 'Operario' };

