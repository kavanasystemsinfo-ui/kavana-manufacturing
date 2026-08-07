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
import { AiAdvisorFab } from './components/AiAdvisorFab.js';
import { USERS_HELP, WORKSTATIONS_HELP, MODELS_HELP, ORDERS_HELP, MODULES_HELP, CUSTOM_FIELDS_HELP } from './help-content.js';

// ── Pestañas extraídas a components/tabs/ ──
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

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('users');
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);

  useEffect(() => {
    void fetchCapabilities().then(setCapabilities).catch(() => {});
  }, []);

  const isModuleEnabled = (key: string) => capabilities?.modules[key]?.enabled === true;

  const tabs: { key: Tab; label: string; module?: string }[] = [
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

  const visibleTabs = tabs.filter((t) => !t.module || isModuleEnabled(t.module));

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-400">Panel de Administración</h1>
          <div className="flex items-center gap-3">
          <nav className="flex gap-1 bg-gray-900/50 rounded-lg p-1">
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-indigo-600 text-white shadow-lg'
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

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'users' && <UsersTab />}
        {tab === 'workstations' && <WorkstationsTab />}
        {tab === 'models' && <ModelsTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'toolings' && <ToolingsTab />}
        {tab === 'incidencias' && <IncidenciasTab />}
        {tab === 'modules' && <ModulesTab />}
        {tab === 'custom-fields' && <CustomFieldsTab />}
        {tab === 'oee' && <OeeDashboard />}
        {tab === 'quality' && <QualityDashboard />}
        {tab === 'cost' && <CostDashboard />}
        {tab === 'materials' && <MaterialsTab />}
      </main>
    </div>
    <AiAdvisorFab />
    </>
  );
}

// ──── Users Tab ────