import { useEffect, useState, useCallback } from 'react';
import {
  listTenants, getTenantStats, createTenant, updateTenant, deleteTenant, toggleTenantModule,
  type GlobalTenant, type TenantStats,
} from './api/admin-entities.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { HelpModal } from './components/HelpModal.js';
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
  const [tab, setTab] = useState<Tab>('tenants');
  const [tenants, setTenants] = useState<GlobalTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const t = await listTenants();
      setTenants(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
          <TenantsTab tenants={tenants} loading={loading} onReload={load} onError={setError} />
        )}
        {tab === 'create' && (
          <CreateTenantTab onCreated={() => { setTab('tenants'); void load(); }} onError={setError} />
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

// ──── Create Tenant Tab ────
function CreateTenantTab({ onCreated, onError }: { onCreated: () => void; onError: (e: string | null) => void }) {
  const [form, setForm] = useState({
    id: 2,
    name: '',
    subdomain: '',
    status: 'trial' as 'active' | 'suspended' | 'trial',
    modules: ['core_mes'],
    admin_username: 'admin',
    admin_password: '',
  });

  async function handleCreate() {
    try {
      await createTenant(form);
      onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Crear Nuevo Cliente</h2>

      <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">ID del Tenant</label>
            <input
              type="number"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: Number(e.target.value) })}
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'suspended' | 'trial' })}
              className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de la empresa</label>
          <input
            placeholder="Ej: Acme Manufacturing"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Subdominio</label>
          <div className="flex items-center gap-0">
            <input
              placeholder="megalux"
              value={form.subdomain}
              onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-l-lg px-3 py-2 text-sm"
            />
            <span className="bg-gray-700 text-gray-400 px-3 py-2 text-sm border border-l-0 border-gray-600 rounded-r-lg">.kavana.app</span>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Credenciales del Admin</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Usuario</label>
              <input
                value={form.admin_username}
                onChange={(e) => setForm({ ...form, admin_username: e.target.value })}
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contraseña</label>
              <input
                type="password"
                value={form.admin_password}
                onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Módulos iniciales</label>
          <div className="flex flex-wrap gap-2">
            {MODULE_KEYS.map((key) => {
              const selected = form.modules.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => {
                    setForm({
                      ...form,
                      modules: selected ? form.modules.filter((m) => m !== key) : [...form.modules, key],
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {MODULE_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => void handleCreate()}
          disabled={!form.name.trim() || !form.subdomain.trim() || !form.admin_password.trim() || form.admin_password.length < 6}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          Crear Cliente
        </button>
        {form.subdomain && (
          <div className="text-center text-xs text-gray-500">
            URL: <span className="text-indigo-400">{form.subdomain}.kavana.app</span>
          </div>
        )}
      </div>
    </div>
  );
}
