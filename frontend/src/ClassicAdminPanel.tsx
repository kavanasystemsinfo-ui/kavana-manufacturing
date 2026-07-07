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

export function ClassicAdminPanel() {
  const [tab, setTab] = useState<Tab>('users');
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);

  useEffect(() => {
    void fetchCapabilities().then(setCapabilities).catch(() => {});
  }, []);

  const isModuleEnabled = (key: string) => capabilities?.modules[key]?.enabled === true;

  const allTabs: { key: Tab; label: string; module?: string }[] = [
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

  const tabs = allTabs.filter((t) => !t.module || isModuleEnabled(t.module));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">Panel de Administración</h1>
          <div className="flex items-center gap-3">
          <nav className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
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

      <main className="max-w-7xl mx-auto px-4 py-5">
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

// ──── Shared inline-edit row style ────
const thStyle = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200';
const tdStyle = 'px-4 py-3 text-sm border-b border-gray-100';
const inputStyle = 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900';
const selectStyle = 'border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white';
const btnSm = 'text-xs font-medium px-2 py-1 rounded transition-colors';
const btnPrimary = `${btnSm} bg-blue-600 text-white hover:bg-blue-700`;
const btnSuccess = `${btnSm} bg-green-600 text-white hover:bg-green-700`;
const btnDanger = `${btnSm} text-red-600 hover:text-red-800 hover:bg-red-50`;
const btnGhost = `${btnSm} text-gray-500 hover:text-gray-700 hover:bg-gray-100`;

// ──── Users Tab (V2 fields) ────
const operatorCategoryLabels: Record<string, string> = {
  peon_especialista: 'Peón Especialista',
  oficial_3: 'Oficial 3',
  oficial_2: 'Oficial 2',
  oficial_1: 'Oficial 1',
};

const roleLabels: Record<string, string> = { tenant_admin: 'Admin', supervisor: 'Supervisor', operario: 'Operario' };

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

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      tenant_admin: 'bg-purple-100 text-purple-700',
      supervisor: 'bg-blue-100 text-blue-700',
      operario: 'bg-green-100 text-green-700',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[role] || 'bg-gray-100 text-gray-700'}`}>{roleLabels[role] || role}</span>;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Usuarios</h2>
          <HelpModal {...USERS_HELP} theme="classic" />
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setEditing(null); setForm(emptyForm); }} className={btnPrimary}>
          + Nuevo
        </button>
      </div>

      {error && <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm">{error}</div>}

      {showCreate && (
        <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Nombre" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputStyle} />
            <input placeholder="Apellidos" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputStyle} />
            <input placeholder="No. Ficha" type="number" value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} className={inputStyle} />
            <input placeholder="Usuario (login)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputStyle} />
            <input placeholder="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputStyle} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })} className={selectStyle}>
              <option value="operario">Operario</option>
              <option value="supervisor">Supervisor</option>
              <option value="tenant_admin">Admin</option>
            </select>
            <select value={form.operator_category} onChange={(e) => setForm({ ...form, operator_category: e.target.value })} className={selectStyle}>
              <option value="peon_especialista">Peón Especialista</option>
              <option value="oficial_3">Oficial 3</option>
              <option value="oficial_2">Oficial 2</option>
              <option value="oficial_1">Oficial 1</option>
            </select>
            <select value={form.default_workstation_id} onChange={(e) => setForm({ ...form, default_workstation_id: e.target.value })} className={selectStyle}>
              <option value="">Sin puesto predeterminado</option>
              {workstations.map((ws) => (<option key={ws.id} value={ws.id}>{ws.name}</option>))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleCreate} className={btnSuccess}>Guardar</button>
            <button onClick={() => setShowCreate(false)} className={btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thStyle}>Nombre</th>
                <th className={thStyle}>Usuario</th>
                <th className={thStyle}>Ficha</th>
                <th className={thStyle}>Rol</th>
                <th className={thStyle}>Categoría</th>
                <th className={thStyle}>Puesto</th>
                <th className={thStyle}>Estado</th>
                <th className={`${thStyle} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  {editing === u.id ? (
                    <>
                      <td className={`${tdStyle} space-y-1`}>
                        <input defaultValue={u.first_name ?? ''} placeholder="Nombre" onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={`${inputStyle} w-full mb-1`} />
                        <input defaultValue={u.last_name ?? ''} placeholder="Apellidos" onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={`${inputStyle} w-full`} />
                      </td>
                      <td className={tdStyle}><input defaultValue={u.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputStyle} /></td>
                      <td className={tdStyle}><input defaultValue={u.employee_number ?? ''} type="number" onChange={(e) => setForm({ ...form, employee_number: e.target.value })} className={`${inputStyle} w-20`} /></td>
                      <td className={tdStyle}>
                        <select defaultValue={u.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })} className={selectStyle}>
                          <option value="operario">Operario</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="tenant_admin">Admin</option>
                        </select>
                      </td>
                      <td className={tdStyle}>
                        <select defaultValue={u.operator_category ?? 'peon_especialista'} onChange={(e) => setForm({ ...form, operator_category: e.target.value })} className={selectStyle}>
                          <option value="peon_especialista">Peón Especialista</option>
                          <option value="oficial_3">Oficial 3</option>
                          <option value="oficial_2">Oficial 2</option>
                          <option value="oficial_1">Oficial 1</option>
                        </select>
                      </td>
                      <td className={tdStyle}>
                        <select defaultValue={u.default_workstation_id ?? ''} onChange={(e) => setForm({ ...form, default_workstation_id: e.target.value })} className={selectStyle}>
                          <option value="">—</option>
                          {workstations.map((ws) => (<option key={ws.id} value={ws.id}>{ws.name}</option>))}
                        </select>
                      </td>
                      <td className={`${tdStyle} text-gray-400`}>—</td>
                      <td className={`${tdStyle} text-right space-x-1`}>
                        <button onClick={() => handleUpdate(u.id)} className={btnSuccess}>Guardar</button>
                        <button onClick={() => setEditing(null)} className={btnGhost}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${tdStyle} text-sm`}>{u.first_name || u.last_name ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : '—'}</td>
                      <td className={`${tdStyle} font-medium`}>{u.username}</td>
                      <td className={`${tdStyle} text-gray-500`}>{u.employee_number ?? '—'}</td>
                      <td className={tdStyle}>{roleBadge(u.role)}</td>
                      <td className={`${tdStyle} text-gray-500`}>{operatorCategoryLabels[u.operator_category ?? 'peon_especialista'] ?? '—'}</td>
                      <td className={`${tdStyle} text-gray-500`}>{workstations.find((ws) => ws.id === u.default_workstation_id)?.name ?? '—'}</td>
                      <td className={tdStyle}>
                        <button onClick={() => void handleToggleActive(u.id, u.is_active)} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className={`${tdStyle} text-right space-x-1`}>
                        <button onClick={() => { setEditing(u.id); setForm({ username: u.username, password: '', role: u.role, first_name: u.first_name ?? '', last_name: u.last_name ?? '', employee_number: u.employee_number?.toString() ?? '', operator_category: u.operator_category ?? 'peon_especialista', default_workstation_id: u.default_workstation_id ?? '' }); }} className={btnGhost}>Editar</button>
                        <button onClick={() => handleDelete(u.id)} className={btnDanger}>Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className={`${tdStyle} text-center text-gray-400 py-6`}>No hay usuarios registrados</td></tr>
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Puestos de Trabajo</h2>
          <HelpModal {...WORKSTATIONS_HELP} theme="classic" />
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setEditing(null); setForm({ name: '', status: 'active' }); }} className={btnPrimary}>
          + Nuevo
        </button>
      </div>

      {error && <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm">{error}</div>}

      {showCreate && (
        <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre del puesto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputStyle} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className={selectStyle}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleCreate} className={btnSuccess}>Guardar</button>
            <button onClick={() => setShowCreate(false)} className={btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thStyle}>Nombre</th>
                <th className={thStyle}>Estado</th>
                <th className={thStyle}>Creado</th>
                <th className={`${thStyle} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  {editing === s.id ? (
                    <>
                      <td className={tdStyle}><input defaultValue={s.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputStyle} /></td>
                      <td className={tdStyle}>
                        <select defaultValue={s.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className={selectStyle}>
                          <option value="active">Activo</option>
                          <option value="inactive">Inactivo</option>
                        </select>
                      </td>
                      <td className={`${tdStyle} text-gray-400`}>—</td>
                      <td className={`${tdStyle} text-right space-x-1`}>
                        <button onClick={() => handleUpdate(s.id)} className={btnSuccess}>Guardar</button>
                        <button onClick={() => setEditing(null)} className={btnGhost}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${tdStyle} font-medium`}>{s.name}</td>
                      <td className={tdStyle}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {s.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className={`${tdStyle} text-gray-400`}>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className={`${tdStyle} text-right space-x-1`}>
                        <button onClick={() => { setEditing(s.id); setForm({ name: s.name, status: s.status }); }} className={btnGhost}>Editar</button>
                        <button onClick={() => handleDelete(s.id)} className={btnDanger}>Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {stations.length === 0 && (
                <tr><td colSpan={4} className={`${tdStyle} text-center text-gray-400 py-6`}>No hay puestos registrados</td></tr>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', unit_of_measure: undefined as ManufacturingModel['unit_of_measure'] | undefined, target_rate: undefined as number | undefined });
  const [oeeEnabled, setOeeEnabled] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [modelsData, caps] = await Promise.all([listManufacturingModels(), fetchCapabilities()]);
      setModels(modelsData);
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
      const payload: { name: string; unit_of_measure?: ManufacturingModel['unit_of_measure']; target_rate?: number } = { name: form.name };
      if (oeeEnabled) {
        if (form.unit_of_measure) payload.unit_of_measure = form.unit_of_measure;
        if (form.target_rate !== undefined) payload.target_rate = form.target_rate;
      }
      await createManufacturingModel(payload);
      setForm({ name: '', unit_of_measure: undefined, target_rate: undefined });
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Modelos de Manufactura</h2>
          <HelpModal {...MODELS_HELP} theme="classic" />
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setEditing(null); setForm({ name: '', unit_of_measure: undefined, target_rate: undefined }); }} className={btnPrimary}>
          + Nuevo
        </button>
      </div>

      {error && <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm">{error}</div>}

      {showCreate && (
        <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre del modelo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputStyle} />
            {oeeEnabled && (
              <select value={form.unit_of_measure ?? ''} onChange={(e) => {
                const unit = (e.target.value || undefined) as ManufacturingModel['unit_of_measure'];
                setForm({ ...form, unit_of_measure: unit, target_rate: unit ? form.target_rate : undefined });
              }} className={inputStyle}>
                <option value="">Sin unidad</option>
                <option value="piezas/h">Piezas/hora</option>
                <option value="m/h">Metros/hora</option>
                <option value="kg/h">Kilogramos/hora</option>
                <option value="L/h">Litros/hora</option>
              </select>
            )}
          </div>
          {oeeEnabled && form.unit_of_measure && (
            <input placeholder={`Meta de producción (${form.unit_of_measure})`} type="number" min="0" step="any" value={form.target_rate ?? ''} onChange={(e) => setForm({ ...form, target_rate: e.target.value ? parseFloat(e.target.value) : undefined })} className={`${inputStyle} mt-3`} />
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={handleCreate} className={btnSuccess}>Guardar</button>
            <button onClick={() => setShowCreate(false)} className={btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thStyle}>Nombre</th>
                {oeeEnabled && <th className={thStyle}>Unidad</th>}
                {oeeEnabled && <th className={thStyle}>Meta</th>}
                <th className={thStyle}>Creado</th>
                <th className={`${thStyle} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  {editing === m.id ? (
                    <>
                      <td className={tdStyle}><input defaultValue={m.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputStyle} /></td>
                      {oeeEnabled && (
                        <td className={tdStyle}>
                          <select defaultValue={m.unit_of_measure ?? ''} onChange={(e) => setForm({ ...form, unit_of_measure: (e.target.value || undefined) as ManufacturingModel['unit_of_measure'] })} className={inputStyle}>
                            <option value="">—</option>
                            <option value="piezas/h">Piezas/hora</option>
                            <option value="m/h">Metros/hora</option>
                            <option value="kg/h">Kilogramos/hora</option>
                            <option value="L/h">Litros/hora</option>
                          </select>
                        </td>
                      )}
                      {oeeEnabled && (
                        <td className={tdStyle}><input defaultValue={m.target_rate ?? ''} type="number" min="0" step="any" onChange={(e) => setForm({ ...form, target_rate: e.target.value ? parseFloat(e.target.value) : undefined })} className={`${inputStyle} w-24`} /></td>
                      )}
                      <td className={`${tdStyle} text-gray-400`}>—</td>
                      <td className={`${tdStyle} text-right space-x-1`}>
                        <button onClick={() => handleUpdate(m.id)} className={btnSuccess}>Guardar</button>
                        <button onClick={() => setEditing(null)} className={btnGhost}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${tdStyle} font-medium`}>{m.name}</td>
                      {oeeEnabled && <td className={`${tdStyle} text-gray-500`}>{m.unit_of_measure ?? '—'}</td>}
                      {oeeEnabled && <td className={`${tdStyle} text-gray-500`}>{m.target_rate ?? '—'}</td>}
                      <td className={`${tdStyle} text-gray-400`}>{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className={`${tdStyle} text-right space-x-1`}>
                        <button onClick={() => { setEditing(m.id); setForm({ name: m.name, unit_of_measure: m.unit_of_measure, target_rate: m.target_rate ?? undefined }); }} className={btnGhost}>Editar</button>
                        <button onClick={() => handleDelete(m.id)} className={btnDanger}>Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {models.length === 0 && (
                <tr><td colSpan={oeeEnabled ? 5 : 3} className={`${tdStyle} text-center text-gray-400 py-6`}>No hay modelos registrados</td></tr>
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Órdenes de Producción</h2>
          <HelpModal {...ORDERS_HELP} theme="classic" />
        </div>
      </div>

      {error && <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thStyle}>ID</th>
                <th className={thStyle}>Estado</th>
                <th className={thStyle}>Cantidad</th>
                <th className={thStyle}>Creado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className={`${tdStyle} font-mono text-gray-400 text-xs`}>{o.id.slice(0, 8)}...</td>
                  <td className={tdStyle}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      o.status === 'completed' ? 'bg-green-100 text-green-700' :
                      o.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {{ pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada', cancelled: 'Cancelada' }[o.status]}
                    </span>
                  </td>
                  <td className={tdStyle}>{o.quantity}</td>
                  <td className={`${tdStyle} text-gray-400`}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={4} className={`${tdStyle} text-center text-gray-400 py-6`}>No hay órdenes registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──── Modules Tab ────
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
              mod.enabled ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50'
            }`}>
              <div>
                <h3 className="text-sm font-medium text-gray-800">{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{mod.enabled ? 'Activo' : 'Inactivo'}</p>
              </div>
              <button
                onClick={() => handleToggle(key, !mod.enabled)}
                disabled={saving === key}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  mod.enabled ? 'bg-blue-600' : 'bg-gray-300'
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
function CustomFieldsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCapabilities().then((data) => {
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Campos Personalizados (Órdenes)</h2>
          <HelpModal {...CUSTOM_FIELDS_HELP} theme="classic" />
        </div>
        <button onClick={addField} className={btnPrimary}>+ Campo</button>
      </div>

      {error && <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="p-4 space-y-2">
          {fields.map((f, idx) => (
            <div key={idx} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/50">
              <input placeholder="clave" value={f.key} onChange={(e) => updateField(idx, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} className={`${inputStyle} w-36`} />
              <input placeholder="etiqueta" value={f.label ?? ''} onChange={(e) => updateField(idx, { label: e.target.value })} className={`${inputStyle} w-36`} />
              <select value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as EditableField['type'] })} className={selectStyle}>
                <option value="string">Texto</option>
                <option value="number">Número</option>
                <option value="boolean">Booleano</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-500">
                <input type="checkbox" checked={f.required} onChange={(e) => updateField(idx, { required: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Req.
              </label>
              <button onClick={() => removeField(idx)} className={`${btnDanger} ml-auto`}>Eliminar</button>
            </div>
          ))}
          {fields.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-400">No hay campos personalizados definidos</div>
          )}
          {fields.length > 0 && (
            <button onClick={handleSave} disabled={saving} className={`${btnSuccess} mt-2`}>
              {saving ? 'Guardando...' : 'Guardar Esquema'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
