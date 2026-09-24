import { useEffect, useState } from 'react';
import {
  getTenantStats, updateTenant, deleteTenant, toggleTenantModule,
  type GlobalTenant, type TenantStats,
} from './api/admin-entities.js';
import { useGlobalAdmin } from './hooks/useGlobalAdmin.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { HelpModal } from './components/HelpModal.js';
import { TenantWizard } from './components/global-admin/TenantWizard.js';
import { GLOBAL_ADMIN_HELP } from './help-content.js';

const MODULE_KEYS = ['core_mes', 'oee_monitoring', 'quality_assurance', 'cost_management'];
const MODULE_LABELS: Record<string, string> = {
  core_mes: 'Core MES',
  oee_monitoring: 'OEE',
  quality_assurance: 'Calidad',
  cost_management: 'Costes',
};

type Tab = 'tenants' | 'create';

export function GlobalAdminPanel() {
  const { tab, setTab, tenants, loading, error, setError, reload } = useGlobalAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-400">Global Admin — Clientes</h1>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1 bg-gray-900/50 rounded-lg p-1">
              {(['tenants', 'create'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    tab === t
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {{ tenants: 'Clientes', create: '+ Nuevo' }[t]}
                </button>
              ))}
            </nav>
            <HelpModal {...GLOBAL_ADMIN_HELP} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        {tab === 'tenants' && (
          <TenantsTab tenants={tenants} loading={loading} onReload={reload} onError={setError} />
        )}
        {tab === 'create' && (
          <TenantWizard onCreated={() => { setTab('tenants'); void reload(); }} onError={setError} />
        )}
      </main>
    </div>
  );
}

// ──── Tenants Tab ────
function TenantsTab({ tenants, loading, onReload, onError }: { tenants: GlobalTenant[]; loading: boolean; onReload: () => void; onError: (e: string | null) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', status: 'active' as 'active' | 'suspended' | 'trial' });

  useEffect(() => {
    if (expanded) {
      void getTenantStats(expanded).then(setStats).catch(() => setStats(null));
    }
  }, [expanded]);

  async function handleUpdate(id: string) {
    try {
      await updateTenant(id, editForm);
      setEditing(null);
      onReload();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    try {
      await deleteTenant(id);
      onReload();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleToggleModule(tenantId: string, moduleKey: string, current: boolean) {
    try {
      await toggleTenantModule(tenantId, moduleKey, !current);
      onReload();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Cargando clientes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Clientes ({tenants.length})</h2>
      </div>

      <div className="space-y-3">
        {tenants.map((t) => {
          const isExpanded = expanded === t.id;
          const modules = (t.feature_matrix as Record<string, unknown>)?.modular_matrix as Record<string, { enabled: boolean }> | undefined;

          return (
            <div key={t.id} className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : t.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.status === 'active' ? 'bg-green-100 text-green-800' :
                    t.status === 'trial' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>{t.status}</span>
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className="text-gray-500 text-sm">ID: {t.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">v{t.governance_version}</span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-700 px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-indigo-400">{stats?.user_count ?? '—'}</div>
                      <div className="text-xs text-gray-400">Usuarios</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-indigo-400">{stats?.workstation_count ?? '—'}</div>
                      <div className="text-xs text-gray-400">Puestos</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-indigo-400">{stats?.order_count ?? '—'}</div>
                      <div className="text-xs text-gray-400">Órdenes</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-indigo-400">{stats?.production_block_count ?? '—'}</div>
                      <div className="text-xs text-gray-400">Bloques prod.</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Módulos</h4>
                    <div className="flex flex-wrap gap-2">
                      {MODULE_KEYS.map((key) => {
                        const enabled = modules?.[key]?.enabled === true;
                        return (
                          <button
                            key={key}
                            onClick={() => void handleToggleModule(t.id, key, enabled)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              enabled
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            {MODULE_LABELS[key]}: {enabled ? 'ON' : 'OFF'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {editing === t.id ? (
                    <div className="bg-gray-900/50 rounded-lg p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          placeholder="Nombre"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
                        />
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'suspended' | 'trial' })}
                          className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="trial">Trial</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => void handleUpdate(t.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">Guardar</button>
                        <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-medium">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditing(t.id); setEditForm({ name: t.name, status: t.status }); }}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => void handleDelete(t.id)}
                        className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800 text-red-300 rounded-lg text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {tenants.length === 0 && (
          <div className="text-center py-12 text-gray-500">No hay clientes registrados</div>
        )}
      </div>
    </div>
  );
}
