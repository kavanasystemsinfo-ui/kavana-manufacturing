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

export function TenantAdminPanel() {
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Zustand hook
  const { loadCapabilities } = useHmiStore();

  // Local state for schema editor
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

  // Sync capabilities custom_fields_schema with local state
  useEffect(() => {
    if (capabilities) {
      const orderSchema = capabilities.customFieldsSchema?.production_orders as any;
      const fields = Array.isArray(orderSchema?.fields) ? orderSchema.fields : [];
      setEditableFields(fields);
    }
  }, [capabilities]);

  async function handleToggle(moduleKey: string, currentEnabled: boolean) {
    if (moduleKey === 'core_mes') return; // Cannot disable

    try {
      setIsMutating(true);
      setError(null);
      await toggleModuleCapability(moduleKey, !currentEnabled);
      await loadCapabilities(); // Refresh Zustand capabilities store
      await loadData(); // Reload to get updated governance_version
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMutating(false);
    }
  }

  // Schema Editor Handlers
  const handleKeyChange = (index: number, val: string) => {
    // Dynamically sanitize key to lowercase and replace spaces/specials with underscores
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
    const updated = editableFields.filter((_, i) => i !== index);
    setEditableFields(updated);
  };

  const handleSaveSchema = async () => {
    // Basic local validation
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
      await loadCapabilities(); // Refresh Zustand capabilities store
      await loadData(); // Reload to get updated governance_version
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMutating(false);
    }
  };

  const moduleNames: Record<string, string> = {
    core_mes: 'Core MES Production',
    oee_monitoring: 'OEE & Machine Monitoring',
    quality_assurance: 'Quality Assurance',
    cost_management: 'Cost & Capex Management',
  };

  // Quotas checking
  const maxCustomFields = Number((capabilities?.quotas as any)?.entities?.max_custom_fields ?? 5);
  const isQuotaExceeded = editableFields.length > maxCustomFields;

  return (
    <main className="min-h-screen bg-kavana-dark text-slate-100 p-4 md:p-8">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-kavana-steel/30 bg-kavana-panel/90 p-4 shadow-kavana-glow md:p-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-kavana-steel/30 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Logo Kavana"
              className="h-16 w-16 rounded-2xl bg-kavana-surface object-cover p-2 ring-1 ring-kavana-orange/40"
            />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.32em] text-emerald-400">Panel Admin</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">Gobernanza Tenant</h1>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-xl bg-kavana-surface px-5 py-3 text-sm font-bold text-slate-100 ring-1 ring-kavana-steel/40 transition hover:bg-kavana-steel/20"
            >
              Volver al Operario
            </a>
            <ThemeToggle />
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            <p className="font-bold">Error:</p>
            <p className="text-sm">{error}</p>
            <p className="mt-2 text-xs opacity-70">
              (Nota de dev: asegúrate de tener el backend corriendo y un token válido en localStorage 'kavana_dev_token' con rol tenant_admin).
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex animate-pulse items-center gap-3 text-kavana-orange">
            <div className="h-4 w-4 rounded-full bg-current"></div>
            <p className="font-bold uppercase tracking-widest">Cargando capacidades...</p>
          </div>
        ) : capabilities ? (
          <div className="grid gap-8">
            <div className="flex flex-wrap gap-4 rounded-2xl bg-kavana-dark/70 p-5 ring-1 ring-kavana-steel/30">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tenant ID</p>
                <p className="text-xl font-black text-white">{capabilities.tenantId}</p>
              </div>
              <div className="h-10 w-px bg-kavana-steel/30"></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Governance Version</p>
                <p className="text-xl font-black text-white">v{capabilities.governanceVersion}</p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-black uppercase tracking-wide text-kavana-steel">Módulos Activos</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(capabilities.modules).map(([key, mod]) => {
                  const isCore = key === 'core_mes';
                  const displayName = moduleNames[key] || key;
                  
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-2xl p-5 ring-1 transition ${
                        mod.enabled
                          ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 ring-emerald-500/30'
                          : 'bg-kavana-dark/40 ring-kavana-steel/20 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white">{displayName}</p>
                        <p className="mt-1 text-xs text-slate-400">{key}</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleToggle(key, mod.enabled)}
                        disabled={isMutating || isCore}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${
                          mod.enabled ? 'bg-emerald-500' : 'bg-kavana-steel/50'
                        } ${isCore ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <span className="sr-only">Use setting</span>
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            mod.enabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Schema Editor for Custom Fields */}
            <div className="border-t border-kavana-steel/30 pt-6">
              <h2 className="text-xl font-black uppercase tracking-wide text-kavana-steel">Configuración de Campos Personalizados</h2>
              <p className="mt-2 text-sm text-slate-400">
                Define las variables sectoriales requeridas para las órdenes de producción (ej.: ancho_bobina, modelo_producto).
              </p>

              <div className="mt-6 space-y-4">
                {editableFields.length === 0 ? (
                  <div className="rounded-2xl bg-kavana-dark/40 p-6 text-center text-slate-500 ring-1 ring-kavana-steel/10">
                    No hay campos personalizados declarados. Pulsa en Añadir Campo para empezar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editableFields.map((field, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-2xl bg-kavana-dark/40 p-4 ring-1 ring-kavana-steel/20 md:flex-row md:items-center"
                      >
                        <div className="flex-1">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Llave del Campo
                          </label>
                          <input
                            type="text"
                            value={field.key}
                            onChange={(e) => handleKeyChange(index, e.target.value)}
                            disabled={isMutating}
                            placeholder="ej. grosor_bobina"
                            className="min-h-[64px] w-full rounded-xl border border-kavana-steel/40 bg-kavana-surface px-4 py-3 text-white focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange outline-none transition disabled:opacity-50"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Etiqueta
                          </label>
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
                            className="min-h-[64px] w-full rounded-xl border border-kavana-steel/40 bg-kavana-surface px-4 py-3 text-white focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange outline-none transition disabled:opacity-50"
                          />
                        </div>

                        <div className="w-full md:w-48">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Tipo de Dato
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => handleTypeChange(index, e.target.value as any)}
                            disabled={isMutating}
                            className="min-h-[64px] w-full rounded-xl border border-kavana-steel/40 bg-kavana-surface px-4 py-3 text-white focus:border-kavana-orange focus:ring-1 focus:ring-kavana-orange outline-none transition disabled:opacity-50"
                          >
                            <option value="string">Texto (string)</option>
                            <option value="number">Número (number)</option>
                            <option value="boolean">Booleano (boolean)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 px-2 min-h-[64px]">
                          <input
                            type="checkbox"
                            id={`req-${index}`}
                            checked={field.required}
                            onChange={(e) => handleRequiredChange(index, e.target.checked)}
                            disabled={isMutating}
                            className="h-6 w-6 rounded border-kavana-steel/40 bg-kavana-surface text-kavana-orange focus:ring-kavana-orange outline-none disabled:opacity-50"
                          />
                          <label htmlFor={`req-${index}`} className="text-sm font-bold text-slate-300">
                            Requerido
                          </label>
                        </div>

                        <div className="flex md:self-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveField(index)}
                            disabled={isMutating}
                            className="min-h-[64px] min-w-[64px] w-full md:w-auto rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 transition active:scale-[0.98] disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quota Exceeded Alert */}
                {isQuotaExceeded && (
                  <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-300 text-sm">
                    ⚠️ Límite de cuota superado ({editableFields.length}/{maxCustomFields}). 
                    Elimina campos o solicita una ampliación de licencia al super_admin antes de poder guardar el esquema.
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleAddField}
                    disabled={isMutating || isQuotaExceeded}
                    className="min-h-[64px] flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Añadir Campo ({editableFields.length} / {maxCustomFields})
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSchema}
                    disabled={isMutating || isQuotaExceeded}
                    className="min-h-[64px] flex-1 rounded-xl bg-kavana-orange hover:bg-kavana-orange-light text-kavana-dark font-black tracking-wide uppercase transition active:scale-[0.98] disabled:bg-kavana-steel/30 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {isMutating ? 'Guardando...' : 'Guardar Esquema'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
