import { useState, useEffect } from 'react';
import { fetchCapabilities, toggleModuleCapability } from '../../api/admin-entities.js';
import type { TenantCapabilities } from '../../api/admin-entities.js';
import { MODULES_HELP } from '../../help-content.js';

interface Props { isClassic?: boolean; }

export function ModulesTab({ isClassic }: Props) {
  const [caps, setCaps] = useState<TenantCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchCapabilities().then(setCaps).catch((e) => setErr(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, []);

  const m = (caps as any)?.feature_matrix?.modular_matrix || {};
  const modules = Object.entries(m as Record<string, { enabled: boolean }>);

  const cardBg = isClassic ? 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm' : 'bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4';
  const label = isClassic ? 'text-sm font-semibold text-gray-700' : 'text-lg font-semibold';
  const toggleOn = 'bg-kavana-orange';
  const toggleOff = isClassic ? 'bg-gray-300' : 'bg-gray-600';

  return (
    <div className={isClassic ? '' : 'space-y-4'}>
      <h2 className={label}>Módulos del Tenant</h2>
      {loading ? <div className={isClassic ? 'text-sm text-gray-400 py-4' : 'text-center py-8 text-gray-400'}>Cargando...</div>
      : err ? <div className={isClassic ? 'bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm' : 'bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm'}>{err}</div>
      : (
        <div className={isClassic ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
          {modules.map(([key, mod]: any) => (
            <div key={key} className={cardBg}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={isClassic ? 'text-sm font-medium text-gray-800' : 'text-sm font-medium text-white'}>{({ core_mes: 'Core MES', oee_monitoring: 'OEE Monitoring', quality_assurance: 'Quality Assurance', cost_management: 'Cost Management', materials_management: 'Materials Management' } as any)[key] || key}</p>
                </div>
                <button
                  onClick={() => key !== 'core_mes' && toggleModuleCapability(key, !mod.enabled).then(() => fetchCapabilities().then(setCaps))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mod.enabled ? toggleOn : toggleOff} ${key === 'core_mes' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mod.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
