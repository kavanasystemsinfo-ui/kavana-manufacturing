import { useEffect, useState, useCallback } from 'react';
import {
  listTenants, getTenantStats, updateTenant, deleteTenant, toggleTenantModule,
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

export function ClassicGlobalAdminPanel() {
  const { tab, setTab, tenants, loading, error, setError, reload } = useGlobalAdmin();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tenants', label: 'Clientes' },
    { key: 'create', label: '+ Nuevo' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">Global Admin — Clientes</h1>
          <div className="flex items-center gap-3">
            <nav className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    tab === t.key
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <HelpModal {...GLOBAL_ADMIN_HELP} theme="classic" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}

        {tab === 'tenants' && (
          <TenantsTab tenants={tenants} loading={loading} onReload={reload} onError={setError} />
        )}
        {tab === 'create' && (
          // 3.1: el wizard de 3 pasos sustituye al formulario todo-en-uno en
          // los DOS temas (misma decisión que el tablero de incidencias: un
          // componente compartido, misma pantalla en clásico y moderno).
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
    return <div className="flex items-center justify-center h-64 text-gray-500">Cargando clientes...</div>;
  }

  const thStyle = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200';
  const tdStyle = 'px-4 py-3 text-sm border-b border-gray-100';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Clientes ({tenants.length})</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className={thStyle}>Estado</th>
              <th className={thStyle}>Nombre</th>
              <th className={thStyle}>ID</th>
              <th className={thStyle}>Módulos</th>
              <th className={thStyle}>Creado</th>
              <th className={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const modules = (t.feature_matrix as Record<string, unknown>)?.modular_matrix as Record<string, { enabled: boolean }> | undefined;
              const enabledCount = MODULE_KEYS.filter((k) => modules?.[k]?.enabled === true).length;

              return (
                <>
                  <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                    <td className={tdStyle}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'active' ? 'bg-green-100 text-green-800' :
                        t.status === 'trial' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>{t.status}</span>
                    </td>
                    <td className={`${tdStyle} font-medium text-gray-800`}>{t.name}</td>
                    <td className={`${tdStyle} text-gray-500`}>{t.id}</td>
                    <td className={`${tdStyle} text-gray-500`}>{enabledCount}/{MODULE_KEYS.length}</td>
                    <td className={`${tdStyle} text-gray-500`}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className={tdStyle}>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setEditing(t.id); setEditForm({ name: t.name, status: t.status }); }}
                          className="text-xs font-medium px-2 py-1 rounded bg-kavana-orange text-white hover:bg-kavana-orange-light"
                        >Editar</button>
                        <button
                          onClick={() => void handleDelete(t.id)}
                          className="text-xs font-medium px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                        >Eliminar</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === t.id && (
                    <tr key={`${t.id}-expanded`}>
                      <td colSpan={6} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                              <div className="text-2xl font-bold text-purple-600">{stats?.user_count ?? '—'}</div>
                              <div className="text-xs text-gray-500">Usuarios</div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                              <div className="text-2xl font-bold text-purple-600">{stats?.workstation_count ?? '—'}</div>
                              <div className="text-xs text-gray-500">Puestos</div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                              <div className="text-2xl font-bold text-purple-600">{stats?.order_count ?? '—'}</div>
                              <div className="text-xs text-gray-500">Órdenes</div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                              <div className="text-2xl font-bold text-purple-600">{stats?.production_block_count ?? '—'}</div>
                              <div className="text-xs text-gray-500">Bloques prod.</div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Módulos</h4>
                            <div className="flex flex-wrap gap-2">
                              {MODULE_KEYS.map((key) => {
                                const enabled = modules?.[key]?.enabled === true;
                                return (
                                  <button
                                    key={key}
                                    onClick={() => void handleToggleModule(t.id, key, enabled)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                      enabled
                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                    }`}
                                  >
                                    {MODULE_LABELS[key]}: {enabled ? 'ON' : 'OFF'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {editing === t.id && (
                            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  placeholder="Nombre"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
                                />
                                <select
                                  value={editForm.status}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'suspended' | 'trial' })}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                                >
                                  <option value="active">Active</option>
                                  <option value="trial">Trial</option>
                                  <option value="suspended">Suspended</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => void handleUpdate(t.id)} className="text-xs font-medium px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">Guardar</button>
                                <button onClick={() => setEditing(null)} className="text-xs font-medium px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {tenants.length === 0 && (
          <div className="text-center py-12 text-gray-400">No hay clientes registrados</div>
        )}
      </div>
    </div>
  );
}
