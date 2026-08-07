import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCapabilities, toggleModuleCapability } from '../../../api/admin-entities.js';
import type { TenantCapabilities } from '../../../api/admin-entities.js';
import { HelpModal } from '../../HelpModal.js';
import { useHmiStore } from '../../../store/hmi-store.js';
import { MODULES_HELP } from '../../../help-content.js';


const thStyle = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200';
const tdStyle = 'px-4 py-3 text-sm border-b border-gray-100';
const inputStyle = 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white text-gray-900';
const selectStyle = 'border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white';
const btnSm = 'text-xs font-medium px-2 py-1 rounded transition-colors';
const btnPrimary = btnSm + ' bg-kavana-orange text-white hover:bg-kavana-orange-light';
const btnSuccess = btnSm + ' bg-green-600 text-white hover:bg-green-700';
const btnDanger = btnSm + ' text-red-600 hover:text-red-800 hover:bg-red-50';
const btnGhost = btnSm + ' text-gray-500 hover:text-gray-700 hover:bg-gray-100';
const roleLabels: Record<string, string> = { tenant_admin: 'Admin', supervisor: 'Supervisor', operario: 'Operario' };
const catLabels: Record<string, string> = { peon_especialista: 'Pe\u00f3n Especialista', oficial_3: 'Oficial 3', oficial_2: 'Oficial 2', oficial_1: 'Oficial 1' };

export function ModulesTab() {
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const { loadCapabilities } = useHmiStore();

  useEffect(() => {
    fetchCapabilities().then(setCapabilities).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, []);

  async function handleToggle(moduleKey: string, enabled: boolean) {
    try {
      setSaving(moduleKey);
      await toggleModuleCapability(moduleKey, enabled);
      setCapabilities((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: {
            ...prev.modules,
            [moduleKey]: { ...prev.modules[moduleKey], enabled },
          },
        };
      });
      await loadCapabilities();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Módulos del Sistema</h2>
          <HelpModal {...MODULES_HELP} theme="classic" />
        </div>
      </div>

      {error && <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</div>
      ) : capabilities && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(capabilities.modules).map(([key, mod]) => (
            <div key={key} className={`border rounded-lg p-3 flex items-center justify-between transition-all ${
              mod.enabled ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200 bg-gray-50/50'
            }`}>
              <div>
                <h3 className="text-sm font-medium text-gray-800">{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{mod.enabled ? 'Activo' : 'Inactivo'}</p>
              </div>
              <button
                onClick={() => handleToggle(key, !mod.enabled)}
                disabled={saving === key}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  mod.enabled ? 'bg-kavana-orange' : 'bg-gray-300'
                } ${saving === key ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${
                  mod.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──── Custom Fields Tab ────
