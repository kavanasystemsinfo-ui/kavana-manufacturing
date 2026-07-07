import { useEffect, useState, useCallback } from 'react';
import {
  listUsers, createUser, updateUser, deleteUser,
  listWorkstations, createWorkstation, updateWorkstation, deleteWorkstation,
  listManufacturingModels, createManufacturingModel, updateManufacturingModel, deleteManufacturingModel,
  listOrders,
  fetchCapabilities, toggleModuleCapability, updateCustomFieldsSchema,
  type User, type Workstation, type ManufacturingModel, type Order, type TenantCapabilities,
} from './api/admin-entities.js';
import { useHmiStore } from './store/hmi-store.js';
import { HelpModal } from './components/HelpModal.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { OeeDashboard } from './components/OeeDashboard.js';
import { QualityDashboard } from './components/QualityDashboard.js';
import { CostDashboard } from './components/CostDashboard.js';
import { USERS_HELP, WORKSTATIONS_HELP, MODELS_HELP, ORDERS_HELP, MODULES_HELP, CUSTOM_FIELDS_HELP } from './help-content.js';

type Tab = 'users' | 'workstations' | 'models' | 'orders' | 'modules' | 'custom-fields' | 'oee' | 'quality' | 'cost';

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
    { key: 'modules', label: 'Módulos' },
    { key: 'custom-fields', label: 'Campos' },
    { key: 'oee', label: 'OEE', module: 'oee_monitoring' },
    { key: 'quality', label: 'Calidad', module: 'quality_assurance' },
    { key: 'cost', label: 'Costes', module: 'cost_management' },
  ];

  const visibleTabs = tabs.filter((t) => !t.module || isModuleEnabled(t.module));

  return (
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
        {tab === 'modules' && <ModulesTab />}
        {tab === 'custom-fields' && <CustomFieldsTab />}
        {tab === 'oee' && <OeeDashboard />}
        {tab === 'quality' && <QualityDashboard />}
        {tab === 'cost' && <CostDashboard />}
      </main>
    </div>
  );
}

// ──── Users Tab ────
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const emptyForm = { username: '', password: '', role: 'operario' as User['role'], first_name: '', last_name: '', employee_number: '', operator_category: 'peon_especialista', default_workstation_id: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, wsData] = await Promise.all([listUsers(), listWorkstations()]);
      setUsers(usersData);
      setWorkstations(wsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate() {
    try {
      await createUser({
        username: form.username,
        password: form.password,
        role: form.role,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        employee_number: form.employee_number ? parseInt(form.employee_number) : undefined,
        operator_category: form.operator_category || undefined,
        default_workstation_id: form.default_workstation_id || undefined,
      });
      setForm(emptyForm);
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateUser(id, {
        username: form.username,
        role: form.role,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        employee_number: form.employee_number ? parseInt(form.employee_number) : null,
        operator_category: form.operator_category || undefined,
        default_workstation_id: form.default_workstation_id || null,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      await updateUser(id, { is_active: !current });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await deleteUser(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const inputStyle = 'bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Usuarios</h2>
          <HelpModal {...USERS_HELP} />
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditing(null); setForm(emptyForm); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Usuario
        </button>
      </div>

      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {showCreate && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Nombre" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputStyle} />
            <input placeholder="Apellidos" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputStyle} />
            <input placeholder="No. Ficha" type="number" value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} className={inputStyle} />
            <input placeholder="Usuario (login)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputStyle} />
            <input placeholder="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputStyle} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })} className={inputStyle}>
              <option value="operario">Operario</option>
              <option value="supervisor">Supervisor</option>
              <option value="tenant_admin">Admin</option>
            </select>
            <select value={form.operator_category} onChange={(e) => setForm({ ...form, operator_category: e.target.value })} className={inputStyle}>
              <option value="peon_especialista">Peón Especialista</option>
              <option value="oficial_3">Oficial 3</option>
              <option value="oficial_2">Oficial 2</option>
              <option value="oficial_1">Oficial 1</option>
            </select>
            <select value={form.default_workstation_id} onChange={(e) => setForm({ ...form, default_workstation_id: e.target.value })} className={inputStyle}>
              <option value="">Sin puesto predeterminado</option>
              {workstations.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors">Guardar</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Ficha</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Puesto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  {editing === u.id ? (
                    <>
                      <td className="px-4 py-3 space-y-1">
                        <input defaultValue={u.first_name ?? ''} placeholder="Nombre" onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={`${inputStyle} w-full mb-1`} />
                        <input defaultValue={u.last_name ?? ''} placeholder="Apellidos" onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={`${inputStyle} w-full`} />
                      </td>
                      <td className="px-4 py-3"><input defaultValue={u.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={`${inputStyle} w-full`} /></td>
                      <td className="px-4 py-3"><input defaultValue={u.employee_number ?? ''} type="number" onChange={(e) => setForm({ ...form, employee_number: e.target.value })} className={`${inputStyle} w-20`} /></td>
                      <td className="px-4 py-3">
                        <select defaultValue={u.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })} className={`${inputStyle} w-full`}>
                          <option value="operario">Operario</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="tenant_admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select defaultValue={u.operator_category ?? 'peon_especialista'} onChange={(e) => setForm({ ...form, operator_category: e.target.value })} className={`${inputStyle} w-full`}>
                          <option value="peon_especialista">Peón Especialista</option>
                          <option value="oficial_3">Oficial 3</option>
                          <option value="oficial_2">Oficial 2</option>
                          <option value="oficial_1">Oficial 1</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select defaultValue={u.default_workstation_id ?? ''} onChange={(e) => setForm({ ...form, default_workstation_id: e.target.value })} className={`${inputStyle} w-full`}>
                          <option value="">—</option>
                          {workstations.map((ws) => (
                            <option key={ws.id} value={ws.id}>{ws.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">—</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => handleUpdate(u.id)} className="text-green-400 hover:text-green-300 text-sm">Guardar</button>
                        <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-300 text-sm">Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm">{u.first_name || u.last_name ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : '—'}</td>
                      <td className="px-4 py-3 font-medium">{u.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{u.employee_number ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === 'tenant_admin' ? 'bg-purple-900/50 text-purple-300' :
                          u.role === 'supervisor' ? 'bg-blue-900/50 text-blue-300' :
                          'bg-green-900/50 text-green-300'
                        }`}>
                          {{ tenant_admin: 'Admin', supervisor: 'Supervisor', operario: 'Operario' }[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{{ peon_especialista: 'Peón Especialista', oficial_3: 'Oficial 3', oficial_2: 'Oficial 2', oficial_1: 'Oficial 1' }[u.operator_category ?? 'peon_especialista'] ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{workstations.find((ws) => ws.id === u.default_workstation_id)?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => void handleToggleActive(u.id, u.is_active)} className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-900/50 text-green-300 hover:bg-green-800/50' : 'bg-red-900/50 text-red-300 hover:bg-red-800/50'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => { setEditing(u.id); setForm({ username: u.username, password: '', role: u.role, first_name: u.first_name ?? '', last_name: u.last_name ?? '', employee_number: u.employee_number?.toString() ?? '', operator_category: u.operator_category ?? 'peon_especialista', default_workstation_id: u.default_workstation_id ?? '' }); }} className="text-indigo-400 hover:text-indigo-300 text-sm">Editar</button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No hay usuarios registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──── Workstations Tab ────
function WorkstationsTab() {
  const [stations, setStations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', status: 'active' as 'active' | 'inactive' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setStations(await listWorkstations());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate() {
    try {
      await createWorkstation(form);
      setForm({ name: '', status: 'active' });
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateWorkstation(id, form);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este puesto?')) return;
    try {
      await deleteWorkstation(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Puestos de Trabajo</h2>
          <HelpModal {...WORKSTATIONS_HELP} />
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditing(null); setForm({ name: '', status: 'active' }); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Puesto
        </button>
      </div>

      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {showCreate && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre del puesto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors">Guardar</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  {editing === s.id ? (
                    <>
                      <td className="px-4 py-3"><input defaultValue={s.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm w-full" /></td>
                      <td className="px-4 py-3">
                        <select defaultValue={s.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm">
                          <option value="active">Activo</option>
                          <option value="inactive">Inactivo</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">—</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => handleUpdate(s.id)} className="text-green-400 hover:text-green-300 text-sm">Guardar</button>
                        <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-300 text-sm">Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          s.status === 'active' ? 'bg-green-900/50 text-green-300' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {s.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => { setEditing(s.id); setForm({ name: s.name, status: s.status }); }} className="text-indigo-400 hover:text-indigo-300 text-sm">Editar</button>
                        <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {stations.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No hay puestos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──── Models Tab ────
function ModelsTab() {
  const [models, setModels] = useState<ManufacturingModel[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', unit_of_measure: undefined as ManufacturingModel['unit_of_measure'] | undefined, target_rate: undefined as number | undefined, workstation_id: undefined as string | undefined });
  const [oeeEnabled, setOeeEnabled] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [modelsData, wsData, caps] = await Promise.all([listManufacturingModels(), listWorkstations(), fetchCapabilities()]);
      setModels(modelsData);
      setWorkstations(wsData);
      setOeeEnabled(caps.modules['oee_monitoring']?.enabled ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate() {
    try {
      const payload: { name: string; unit_of_measure?: ManufacturingModel['unit_of_measure']; target_rate?: number; workstation_id?: string } = { name: form.name };
      if (form.workstation_id) payload.workstation_id = form.workstation_id;
      if (oeeEnabled) {
        if (form.unit_of_measure) payload.unit_of_measure = form.unit_of_measure;
        if (form.target_rate !== undefined) payload.target_rate = form.target_rate;
      }
      await createManufacturingModel(payload);
      setForm({ name: '', unit_of_measure: undefined, target_rate: undefined, workstation_id: undefined });
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateManufacturingModel(id, form);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este modelo?')) return;
    try {
      await deleteManufacturingModel(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Modelos de Manufactura</h2>
          <HelpModal {...MODELS_HELP} />
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditing(null); setForm({ name: '', unit_of_measure: undefined, target_rate: undefined, workstation_id: undefined }); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Modelo
        </button>
      </div>

      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {showCreate && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre del modelo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <select value={form.workstation_id ?? ''} onChange={(e) => setForm({ ...form, workstation_id: e.target.value || undefined })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">Sin puesto asignado</option>
              {workstations.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
            {oeeEnabled && (
              <select value={form.unit_of_measure ?? ''} onChange={(e) => {
                const unit = (e.target.value || undefined) as ManufacturingModel['unit_of_measure'];
                setForm({ ...form, unit_of_measure: unit, target_rate: unit ? form.target_rate : undefined });
              }} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">Sin unidad</option>
                <option value="piezas/h">Piezas/hora</option>
                <option value="m/h">Metros/hora</option>
                <option value="kg/h">Kilogramos/hora</option>
                <option value="L/h">Litros/hora</option>
              </select>
            )}
          </div>
          {oeeEnabled && form.unit_of_measure && (
            <input placeholder={`Meta de producción (${form.unit_of_measure})`} type="number" min="0" step="any" value={form.target_rate ?? ''} onChange={(e) => setForm({ ...form, target_rate: e.target.value ? parseFloat(e.target.value) : undefined })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          )}
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors">Guardar</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Puesto</th>
                {oeeEnabled && <th className="px-4 py-3">Unidad</th>}
                {oeeEnabled && <th className="px-4 py-3">Meta</th>}
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  {editing === m.id ? (
                    <>
                      <td className="px-4 py-3"><input defaultValue={m.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm w-full" /></td>
                      <td className="px-4 py-3">
                        <select defaultValue={m.workstation_id ?? ''} onChange={(e) => setForm({ ...form, workstation_id: e.target.value || undefined })} className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm">
                          <option value="">—</option>
                          {workstations.map((ws) => (
                            <option key={ws.id} value={ws.id}>{ws.name}</option>
                          ))}
                        </select>
                      </td>
                      {oeeEnabled && (
                        <td className="px-4 py-3">
                          <select defaultValue={m.unit_of_measure ?? ''} onChange={(e) => setForm({ ...form, unit_of_measure: (e.target.value || undefined) as ManufacturingModel['unit_of_measure'] })} className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm">
                            <option value="">—</option>
                            <option value="piezas/h">Piezas/hora</option>
                            <option value="m/h">Metros/hora</option>
                            <option value="kg/h">Kilogramos/hora</option>
                            <option value="L/h">Litros/hora</option>
                          </select>
                        </td>
                      )}
                      {oeeEnabled && (
                        <td className="px-4 py-3"><input defaultValue={m.target_rate ?? ''} type="number" min="0" step="any" onChange={(e) => setForm({ ...form, target_rate: e.target.value ? parseFloat(e.target.value) : undefined })} className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm w-24" /></td>
                      )}
                      <td className="px-4 py-3 text-gray-500 text-sm">—</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => handleUpdate(m.id)} className="text-green-400 hover:text-green-300 text-sm">Guardar</button>
                        <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-300 text-sm">Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{workstations.find((ws) => ws.id === m.workstation_id)?.name ?? '—'}</td>
                      {oeeEnabled && <td className="px-4 py-3 text-sm text-gray-400">{m.unit_of_measure ?? '—'}</td>}
                      {oeeEnabled && <td className="px-4 py-3 text-sm text-gray-400">{m.target_rate ?? '—'}</td>}
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => { setEditing(m.id); setForm({ name: m.name, unit_of_measure: m.unit_of_measure, target_rate: m.target_rate ?? undefined, workstation_id: m.workstation_id ?? undefined }); }} className="text-indigo-400 hover:text-indigo-300 text-sm">Editar</button>
                        <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {models.length === 0 && (
                <tr><td colSpan={oeeEnabled ? 5 : 3} className="px-4 py-8 text-center text-gray-500">No hay modelos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──── Orders Tab (read-only) ────
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders().then(setOrders).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Órdenes de Producción</h2>
        <HelpModal {...ORDERS_HELP} />
      </div>
      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-400">{o.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      o.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                      o.status === 'in_progress' ? 'bg-blue-900/50 text-blue-300' :
                      o.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {{ pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada', cancelled: 'Cancelada' }[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{o.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay órdenes registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──── Modules Tab (feature flags) ────
function ModulesTab() {
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

// ──── Custom Fields Tab ────
function CustomFieldsTab() {
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCapabilities().then((data) => {
      setCapabilities(data);
      const orderSchema = data.customFieldsSchema?.production_orders as any;
      const f = Array.isArray(orderSchema?.fields) ? orderSchema.fields : [];
      setFields(f);
    }).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, []);

  function addField() {
    setFields([...fields, { key: '', label: '', type: 'string', required: false }]);
  }

  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx));
  }

  function updateField(idx: number, patch: Partial<EditableField>) {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  async function handleSave() {
    try {
      setSaving(true);
      const valid = fields.filter((f) => f.key.trim());
      await updateCustomFieldsSchema({ fields: valid });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Campos Personalizados (Órdenes)</h2>
          <HelpModal {...CUSTOM_FIELDS_HELP} />
        </div>
        <button onClick={addField} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
          + Campo
        </button>
      </div>
      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {fields.map((f, idx) => (
            <div key={idx} className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4 flex items-center gap-3">
              <input placeholder="clave" value={f.key} onChange={(e) => updateField(idx, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm w-40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500" />
              <input placeholder="etiqueta" value={f.label ?? ''} onChange={(e) => updateField(idx, { label: e.target.value })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm w-40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500" />
              <select value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as EditableField['type'] })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="string">Texto</option>
                <option value="number">Número</option>
                <option value="boolean">Booleano</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={f.required} onChange={(e) => updateField(idx, { required: e.target.checked })} className="rounded border-gray-600 bg-gray-900 text-indigo-500 focus:ring-indigo-500" />
                Requerido
              </label>
              <button onClick={() => removeField(idx)} className="ml-auto text-red-400 hover:text-red-300 text-sm">Eliminar</button>
            </div>
          ))}
          {fields.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay campos personalizados definidos</div>
          )}
          {fields.length > 0 && (
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar Esquema'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
