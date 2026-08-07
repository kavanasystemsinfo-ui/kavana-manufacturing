import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useHmiStore } from '../../store/hmi-store.js';
import type { TenantCapabilities } from '../../api/admin-entities.js';
import { fetchCapabilities, toggleModuleCapability } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { MODULES_HELP } from '../../help-content.js';

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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Módulos del Sistema</h2>
        <HelpModal {...MODULES_HELP} />
      </div>
      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : capabilities && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(capabilities.modules).map(([key, mod]) => (
            <div key={key} className={`bg-gray-800/80 backdrop-blur-sm rounded-xl border p-4 transition-all ${
              mod.enabled ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-gray-700 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
                  <p className="text-xs text-gray-500 mt-1">{mod.enabled ? 'Activo' : 'Inactivo'}</p>
                </div>
                <button
                  onClick={() => handleToggle(key, !mod.enabled)}
                  disabled={saving === key}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    mod.enabled ? 'bg-indigo-600' : 'bg-gray-600'
                  } ${saving === key ? 'opacity-50' : ''}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    mod.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
