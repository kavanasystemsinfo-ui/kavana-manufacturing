import { useEffect, useState } from 'react';
import logo from '../../logo.png';
import {
  fetchCapabilities,
  toggleModuleCapability,
  updateCustomFieldsSchema,
  type TenantCapabilities,
} from './api/admin.js';
import { useHmiStore } from './store/hmi-store.js';
import { ThemeToggle } from './components/ThemeToggle.js';

interface EditableField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

const moduleNames: Record<string, string> = {
  core_mes: 'Core MES Production',
  oee_monitoring: 'OEE & Machine Monitoring',
  quality_assurance: 'Quality Assurance',
  cost_management: 'Cost & Capex Management',
};

export function ClassicTenantAdminPanel() {
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const { loadCapabilities } = useHmiStore();
  const [editableFields, setEditableFields] = useState<EditableField[]>([]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCapabilities();
      setCapabilities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (capabilities) {
      const orderSchema = capabilities.customFieldsSchema?.production_orders as any;
      const fields = Array.isArray(orderSchema?.fields) ? orderSchema.fields : [];
      setEditableFields(fields);
    }
  }, [capabilities]);

  async function handleToggle(moduleKey: string, currentEnabled: boolean) {
    if (moduleKey === 'core_mes') return;
    try {
      setIsMutating(true);
      setError(null);
      await toggleModuleCapability(moduleKey, !currentEnabled);
      await loadCapabilities();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMutating(false);
    }
  }

  const handleKeyChange = (index: number, val: string) => {
    const sanitized = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const updated = [...editableFields];
    updated[index].key = sanitized;
    setEditableFields(updated);
  };

  const handleTypeChange = (index: number, val: 'string' | 'number' | 'boolean') => {
    const updated = [...editableFields];
    updated[index].type = val;
    setEditableFields(updated);
  };

  const handleRequiredChange = (index: number, val: boolean) => {
    const updated = [...editableFields];
    updated[index].required = val;
    setEditableFields(updated);
  };

  const handleAddField = () => {
    setEditableFields([...editableFields, { key: '', label: '', type: 'string', required: false }]);
  };

  const handleRemoveField = (index: number) => {
    setEditableFields(editableFields.filter((_, i) => i !== index));
  };

  const handleSaveSchema = async () => {
    const keys = editableFields.map(f => f.key.trim());
    if (keys.some(k => k === '')) {
      setError('Todas las llaves de los campos personalizados deben tener un nombre.');
      return;
    }
    if (new Set(keys).size !== keys.length) {
      setError('No se permiten llaves de campos duplicados.');
      return;
    }
    try {
      setIsMutating(true);
      setError(null);
      await updateCustomFieldsSchema({ fields: editableFields });
      await loadCapabilities();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMutating(false);
    }
  };

  const maxCustomFields = Number((capabilities?.quotas as any)?.entities?.max_custom_fields ?? 5);
  const isQuotaExceeded = editableFields.length > maxCustomFields;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Panel Admin</h1>
                <p className="text-xs text-slate-500">Gobernanza Tenant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Volver al Operario
            </a>
            <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-3 text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
            <p className="text-sm">Cargando capacidades...</p>
          </div>
        ) : capabilities ? (
          <div className="space-y-6">
            {/* Tenant Info */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tenant ID</p>
                  <p className="text-lg font-semibold text-slate-900">{capabilities.tenantId}</p>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Governance Version</p>
                  <p className="text-lg font-semibold text-slate-900">v{capabilities.governanceVersion}</p>
                </div>
              </div>
            </div>

            {/* Modules Table */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Módulos Activos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Módulo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Clave</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">Estado</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {Object.entries(capabilities.modules).map(([key, mod]) => {
                      const isCore = key === 'core_mes';
                      const displayName = moduleNames[key] || key;
                      return (
                        <tr key={key} className={mod.enabled ? '' : 'bg-slate-50 opacity-60'}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{displayName}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{key}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              mod.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {mod.enabled ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(key, mod.enabled)}
                              disabled={isMutating || isCore}
                              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition ${
                                isCore
                                  ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                  : mod.enabled
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                              }`}
                            >
                              {isCore ? 'N/A' : mod.enabled ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Fields Editor */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Campos Personalizados</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Define las variables sectoriales requeridas para las órdenes de producción.
                </p>
              </div>
              <div className="p-4">
                {editableFields.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    No hay campos personalizados declarados. Pulsa en Añadir Campo para empezar.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Llave</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Etiqueta</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Tipo</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">Requerido</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {editableFields.map((field, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={field.key}
                                onChange={(e) => handleKeyChange(index, e.target.value)}
                                disabled={isMutating}
                                placeholder="ej. grosor_bobina"
                                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={field.label ?? ''}
                                onChange={(e) => {
                                  const updated = [...editableFields];
                                  updated[index].label = e.target.value;
                                  setEditableFields(updated);
                                }}
                                disabled={isMutating}
                                placeholder="ej. Grosor Bobina"
                                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={field.type}
                                onChange={(e) => handleTypeChange(index, e.target.value as any)}
                                disabled={isMutating}
                                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                              >
                                <option value="string">Texto</option>
                                <option value="number">Número</option>
                                <option value="boolean">Booleano</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => handleRequiredChange(index, e.target.checked)}
                                disabled={isMutating}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveField(index)}
                                disabled={isMutating}
                                className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {isQuotaExceeded && (
                  <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                    Límite de cuota superado ({editableFields.length}/{maxCustomFields}). 
                    Elimina campos o solicita una ampliación de licencia.
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddField}
                    disabled={isMutating || isQuotaExceeded}
                    className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    + Añadir Campo ({editableFields.length} / {maxCustomFields})
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSchema}
                    disabled={isMutating || isQuotaExceeded}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isMutating ? 'Guardando...' : 'Guardar Esquema'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
