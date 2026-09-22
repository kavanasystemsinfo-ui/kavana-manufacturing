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

interface TabGroup {
  key: string;
  label: string;
  icon: string;
  tabs: { key: Tab; label: string; module?: string }[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    key: 'gestion',
    label: 'Gestión',
    icon: '⚙️',
    tabs: [
      { key: 'users', label: 'Usuarios' },
      { key: 'workstations', label: 'Puestos' },
      { key: 'models', label: 'Modelos' },
      { key: 'materials', label: 'Materias Primas' },
    ],
  },
  {
    key: 'produccion',
    label: 'Producción',
    icon: '🏭',
    tabs: [
      { key: 'orders', label: 'Órdenes' },
      { key: 'toolings', label: 'Utillajes' },
    ],
  },
  {
    key: 'calidad',
    label: 'Calidad',
    icon: '🔍',
    tabs: [
      { key: 'incidencias', label: 'Incidencias' },
      { key: 'quality', label: 'Calidad', module: 'quality_assurance' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: '📊',
    tabs: [
      { key: 'oee', label: 'OEE', module: 'oee_monitoring' },
      { key: 'cost', label: 'Costes', module: 'cost_management' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    icon: '🔧',
    tabs: [
      { key: 'modules', label: 'Módulos' },
      { key: 'custom-fields', label: 'Campos' },
    ],
  },
];

const STORAGE_KEY = 'kavana_admin_expanded_groups';

function getInitialExpanded(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // localStorage no disponible: fallback a estado por defecto
  }
  // Por defecto: solo "Gestión" expandido
  return { gestion: true };
}

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('users');
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(getInitialExpanded);

  useEffect(() => {
    void fetchCapabilities().then(setCapabilities).catch(() => {});
  }, []);

  const isModuleEnabled = (key: string) => capabilities?.modules[key]?.enabled === true;

  const handleGroupToggle = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {
        // localStorage no disponible: el estado no persiste entre sesiones
      }
      return next;
    });
  };

  const renderTabContent = (tabKey: Tab) => {
    switch (tabKey) {
      case 'users': return <UsersTab />;
      case 'workstations': return <WorkstationsTab />;
      case 'models': return <ModelsTab />;
      case 'orders': return <OrdersTab />;
      case 'toolings': return <ToolingsTab />;
      case 'incidencias': return <IncidenciasTab />;
      case 'modules': return <ModulesTab />;
      case 'custom-fields': return <CustomFieldsTab />;
      case 'oee': return <OeeDashboard />;
      case 'quality': return <QualityDashboard />;
      case 'cost': return <CostDashboard />;
      case 'materials': return <MaterialsTab />;
      default: return null;
    }
  };

  const isTabVisible = (t: { key: Tab; module?: string }) => !t.module || isModuleEnabled(t.module);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-400">Panel de Administración</h1>
          <div className="flex items-center gap-3">
            <nav className="flex-1" aria-label="Navegación principal de administración">
              <div className="space-y-1" role="tablist">
                {TAB_GROUPS.map((group) => {
                  const visibleTabs = group.tabs.filter(isTabVisible);
                  if (visibleTabs.length === 0) return null;
                  const isExpanded = expandedGroups[group.key] ?? false;

                  return (
                    <div key={group.key} className="bg-gray-900/50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleGroupToggle(group.key)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-expanded={isExpanded}
                        aria-controls={`panel-${group.key}`}
                        role="tab"
                      >
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true">{group.icon}</span>
                          <span>{group.label}</span>
                          <span className="rounded-full bg-indigo-600/20 px-2 py-0.5 text-xs font-bold text-indigo-300">
                            {visibleTabs.length}
                          </span>
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div
                        id={`panel-${group.key}`}
                        role="tabpanel"
                        className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
                        aria-hidden={!isExpanded}
                      >
                        <div className="px-2 pb-2 space-y-1" role="tablist">
                          {visibleTabs.map((t) => (
                            <button
                              key={t.key}
                              onClick={() => setTab(t.key)}
                              className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                tab === t.key
                                  ? 'bg-indigo-600 text-white shadow'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                              }`}
                              role="tab"
                              aria-selected={tab === t.key}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderTabContent(tab)}
      </main>
    </div>
    <AiAdvisorFab />
    </>
  );
}