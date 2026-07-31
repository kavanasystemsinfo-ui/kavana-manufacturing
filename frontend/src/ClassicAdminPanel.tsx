import { useEffect, useState, useCallback } from 'react';
import {
  listUsers, createUser, updateUser, deleteUser,
  listWorkstations, createWorkstation, updateWorkstation, deleteWorkstation,
  listManufacturingModels, createManufacturingModel, updateManufacturingModel, deleteManufacturingModel,
  listOrders,
  fetchCapabilities, toggleModuleCapability, updateCustomFieldsSchema,
  listToolings, createTooling, updateTooling, deleteTooling, incrementToolingByPieces,
  fetchToolingTypes, saveToolingTypes,
  listIncidencias, createIncidencia, updateIncidencia, deleteIncidencia, getIncidenciaStats,
  type User, type Workstation, type ManufacturingModel, type Order, type TenantCapabilities, type Tooling, type Incidencia, type IncidenciaStats,
} from './api/admin-entities.js';
import { useHmiStore } from './store/hmi-store.js';
import { HelpModal } from './components/HelpModal.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { OeeDashboard } from './components/OeeDashboard.js';
import { QualityDashboard } from './components/QualityDashboard.js';
import { CostDashboard } from './components/CostDashboard.js';
import { USERS_HELP, WORKSTATIONS_HELP, MODELS_HELP, ORDERS_HELP, MODULES_HELP, CUSTOM_FIELDS_HELP } from './help-content.js';

type Tab = 'users' | 'workstations' | 'models' | 'orders' | 'modules' | 'custom-fields' | 'oee' | 'quality' | 'cost' | 'toolings' | 'incidencias' | 'materials';

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
    { key: 'toolings', label: 'Utillajes' },
    { key: 'incidencias', label: 'Incidencias' },
    { key: 'modules', label: 'Módulos' },
    { key: 'custom-fields', label: 'Campos' },
    { key: 'oee', label: 'OEE', module: 'oee_monitoring' },
    { key: 'quality', label: 'Calidad', module: 'quality_assurance' },
    { key: 'cost', label: 'Costes', module: 'cost_management' },
    { key: 'materials', label: 'Materias Primas', module: 'materials_management' },
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
        {tab === 'toolings' && <ToolingsTab />}
        {tab === 'incidencias' && <IncidenciasTab />}
        {tab === 'modules' && <ModulesTab />}
        {tab === 'custom-fields' && <CustomFieldsTab />}
        {tab === 'oee' && <OeeDashboard />}
        {tab === 'quality' && <QualityDashboard />}
        {tab === 'cost' && <CostDashboard />}
        {tab === 'materials' && <MaterialsTab />}
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

// ──── Toolings Tab ────
function ToolingsTab() {
  const [toolings, setToolings] = useState<Tooling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toolingTypes, setToolingTypes] = useState<string[]>(['troquel', 'molde', 'punzon', 'rodillo', 'matriz', 'otro']);
  const [showTypeConfig, setShowTypeConfig] = useState(false);
  const [newType, setNewType] = useState('');
  const [produceModal, setProduceModal] = useState<string | null>(null);
  const [producePieces, setProducePieces] = useState('');
  const emptyForm = { code: '', name: '', type: 'troquel', location: '', max_cycles: '100000', warning_pct: '80', cycles_per_piece: '0', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const [data, types] = await Promise.all([listToolings(), fetchToolingTypes()]);
      setToolings(data);
      if (types.length > 0) setToolingTypes(types);
    } catch { setError('Error al cargar utillajes'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    try {
      await createTooling({
        code: form.code,
        name: form.name,
        type: form.type,
        location: form.location || undefined,
        max_cycles: parseInt(form.max_cycles) || 100000,
        warning_pct: parseInt(form.warning_pct) || 80,
        cycles_per_piece: parseFloat(form.cycles_per_piece) || 0,
        notes: form.notes || undefined,
      });
      setShowCreate(false);
      setForm(emptyForm);
      void load();
    } catch { setError('Error al crear utillaje'); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await updateTooling(editing, {
        code: form.code,
        name: form.name,
        type: form.type,
        location: form.location || undefined,
        max_cycles: parseInt(form.max_cycles) || 100000,
        warning_pct: parseInt(form.warning_pct) || 80,
        cycles_per_piece: parseFloat(form.cycles_per_piece) || 0,
        notes: form.notes || undefined,
      });
      setEditing(null);
      setForm(emptyForm);
      void load();
    } catch { setError('Error al actualizar utillaje'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este utillaje?')) return;
    try {
      await deleteTooling(id);
      void load();
    } catch { setError('Error al eliminar utillaje'); }
  };

  const handleProduce = async () => {
    if (!produceModal || !producePieces) return;
    try {
      await incrementToolingByPieces(produceModal, parseInt(producePieces));
      setProduceModal(null);
      setProducePieces('');
      void load();
    } catch { setError('Error al registrar producción'); }
  };

  const startEdit = (t: Tooling) => {
    setEditing(t.id);
    setForm({
      code: t.code,
      name: t.name,
      type: t.type,
      location: t.location || '',
      max_cycles: String(t.max_cycles),
      warning_pct: String(t.warning_pct),
      cycles_per_piece: String(t.cycles_per_piece),
      notes: t.notes || '',
    });
  };

  const saveTypes = async () => {
    try {
      await saveToolingTypes(toolingTypes);
      setShowTypeConfig(false);
    } catch { setError('Error al guardar tipos'); }
  };

  const addType = () => {
    if (newType && !toolingTypes.includes(newType)) {
      setToolingTypes([...toolingTypes, newType]);
      setNewType('');
    }
  };

  const removeType = (type: string) => {
    setToolingTypes(toolingTypes.filter(t => t !== type));
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'activo') return 'bg-green-100 text-green-800 border border-green-200';
    if (status === 'mantenimiento') return 'bg-amber-100 text-amber-800 border border-amber-200';
    return 'bg-gray-100 text-gray-500 border border-gray-200';
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando utillajes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Utillajes</h2>
          <p className="text-sm text-blue-600 mt-1">Herramienta de estimación preventiva de vida útil</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTypeConfig(true)} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors text-gray-700">
            ⚙️ Configurar tipos
          </button>
          <button onClick={() => { setShowCreate(true); setEditing(null); setForm(emptyForm); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors text-white">
            + Nuevo Utillaje
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-700 text-sm">
        ℹ️ Los ciclos se estiman automáticamente: <code className="bg-blue-100 px-1 rounded">cycles_per_piece × piezas_producidas</code>. Registra producción con el botón ▶ Producción.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {toolings.map((t) => {
          const pct = t.max_cycles > 0 ? (t.current_cycles / t.max_cycles) * 100 : 0;
          const isWarning = pct >= t.warning_pct;
          return (
            <div key={t.id} className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md ${isWarning ? 'border-amber-300 shadow-amber-100' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-semibold">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t.code} · {t.type}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-blue-600 text-sm px-1">✏️</button>
                  <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-600 text-sm px-1">🗑️</button>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Ciclos: {Math.round(t.current_cycles).toLocaleString()} / {t.max_cycles.toLocaleString()}</span>
                  <span className={isWarning ? 'text-amber-600 font-semibold' : ''}>{Math.round(pct)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${getProgressColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>

              {t.cycles_per_piece > 0 && (
                <div className="text-xs text-gray-500 mb-3">
                  <span className="text-blue-600">⚡ {t.cycles_per_piece} ciclos/pieza</span>
                  {t.estimated_pieces !== null && t.estimated_pieces > 0 && (
                    <span className="ml-2">· ~{t.estimated_pieces.toLocaleString()} piezas</span>
                  )}
                </div>
              )}

              {t.location && (
                <div className="text-xs text-gray-400 mb-3">📍 {t.location}</div>
              )}

              <button
                onClick={() => { setProduceModal(t.id); setProducePieces(''); }}
                className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium transition-colors text-white"
              >
                ▶ Producción
              </button>
            </div>
          );
        })}
        {toolings.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            No hay utillajes configurados. Crea uno para empezar.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Utillaje' : 'Nuevo Utillaje'}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Código *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputStyle} placeholder="TROQ-001" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectStyle}>
                    {toolingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputStyle} placeholder="Troquel principal línea 1" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ubicación</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputStyle} placeholder="Línea 1, Zona A" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Vida útil</label>
                  <input type="number" value={form.max_cycles} onChange={(e) => setForm({ ...form, max_cycles: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Alerta %</label>
                  <input type="number" value={form.warning_pct} onChange={(e) => setForm({ ...form, warning_pct: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ciclos/pieza</label>
                  <input type="number" step="0.1" value={form.cycles_per_piece} onChange={(e) => setForm({ ...form, cycles_per_piece: e.target.value })} className={inputStyle} />
                  <p className="text-[10px] text-gray-400 mt-1">Se multiplica × piezas</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputStyle} rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowCreate(false); setEditing(null); setForm(emptyForm); }} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
                <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.code || !form.name} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-white">
                  {editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Produce Modal */}
      {produceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Registrar Producción</h3>
            <p className="text-sm text-gray-500 mb-4">Las piezas se multiplican automáticamente por los ciclos/pieza del utillaje.</p>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Piezas producidas</label>
              <input type="number" value={producePieces} onChange={(e) => setProducePieces(e.target.value)} className={inputStyle} placeholder="100" autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setProduceModal(null)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={handleProduce} disabled={!producePieces || parseInt(producePieces) <= 0} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-white">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Type Config Modal */}
      {showTypeConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Configurar Tipos de Utillaje</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {toolingTypes.map(t => (
                  <span key={t} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {t}
                    <button onClick={() => removeType(t)} className="text-blue-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newType} onChange={(e) => setNewType(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addType()} className={`flex-1 ${inputStyle}`} placeholder="Nuevo tipo..." />
                <button onClick={addType} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">+</button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowTypeConfig(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
                <button onClick={saveTypes} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors text-white">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──── Incidencias Tab ────
function IncidenciasTab() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [stats, setStats] = useState<IncidenciaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const emptyForm = { title: '', type: 'produccion', severity: 'media', description: '', assigned_to: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const [data, s] = await Promise.all([listIncidencias(), getIncidenciaStats()]);
      setIncidencias(data);
      setStats(s);
    } catch { setError('Error al cargar incidencias'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    try {
      await createIncidencia({
        reported_by: '00000000-0000-0000-0000-000000000000',
        type: form.type,
        severity: form.severity,
        title: form.title,
        description: form.description || undefined,
        assigned_to: form.assigned_to || undefined,
      });
      setShowCreate(false);
      setForm(emptyForm);
      void load();
    } catch { setError('Error al crear incidencia'); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await updateIncidencia(editing, {
        type: form.type,
        severity: form.severity,
        title: form.title,
        description: form.description || undefined,
      });
      setEditing(null);
      setForm(emptyForm);
      void load();
    } catch { setError('Error al actualizar incidencia'); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateIncidencia(id, { status });
      void load();
    } catch { setError('Error al cambiar estado'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta incidencia?')) return;
    try {
      await deleteIncidencia(id);
      void load();
    } catch { setError('Error al eliminar incidencia'); }
  };

  const startEdit = (inc: Incidencia) => {
    setEditing(inc.id);
    setForm({
      title: inc.title,
      type: inc.type,
      severity: inc.severity,
      description: inc.description || '',
      assigned_to: inc.assigned_to || '',
    });
  };

  const filtered = filterStatus === 'all' ? incidencias : incidencias.filter(i => i.status === filterStatus);

  const getSeverityBadge = (severity: string) => {
    if (severity === 'critica') return 'bg-red-100 text-red-800 border border-red-200';
    if (severity === 'alta') return 'bg-orange-100 text-orange-800 border border-orange-200';
    if (severity === 'media') return 'bg-amber-100 text-amber-800 border border-amber-200';
    return 'bg-gray-100 text-gray-500 border border-gray-200';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'abierto') return 'bg-red-100 text-red-800 border border-red-200';
    if (status === 'en_progreso') return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (status === 'resuelto') return 'bg-green-100 text-green-800 border border-green-200';
    return 'bg-gray-100 text-gray-500 border border-gray-200';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { calidad: 'Calidad', seguridad: 'Seguridad', mantenimiento: 'Mantenimiento', produccion: 'Producción', otro: 'Otro' };
    return labels[type] || type;
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando incidencias...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Incidencias</h2>
          <p className="text-sm text-blue-600 mt-1">Registro y seguimiento de incidencias</p>
        </div>
        <button onClick={() => { setShowCreate(true); setEditing(null); setForm(emptyForm); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors text-white">
          + Nueva Incidencia
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.abiertas}</div>
            <div className="text-xs text-red-600">Abiertas</div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.en_progreso}</div>
            <div className="text-xs text-blue-600">En Progreso</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.resueltas + stats.cerradas}</div>
            <div className="text-xs text-green-600">Resueltas</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'abierto', 'en_progreso', 'resuelto', 'cerrado'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'}`}
          >
            {s === 'all' ? 'Todas' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((inc) => (
          <div key={inc.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-900 font-semibold">{inc.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityBadge(inc.severity)}`}>
                    {inc.severity}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(inc.status)}`}>
                    {inc.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {getTypeLabel(inc.type)} · {new Date(inc.created_at).toLocaleDateString()}
                </div>
                {inc.description && (
                  <div className="text-sm text-gray-600 mb-2">{inc.description}</div>
                )}
              </div>
              <div className="flex gap-1 ml-4">
                <button onClick={() => startEdit(inc)} className="text-gray-400 hover:text-blue-600 text-sm px-1">✏️</button>
                <button onClick={() => handleDelete(inc.id)} className="text-gray-400 hover:text-red-600 text-sm px-1">🗑️</button>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {inc.status === 'abierto' && (
                <button onClick={() => handleStatusChange(inc.id, 'en_progreso')} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors text-white">
                  Iniciar
                </button>
              )}
              {inc.status === 'en_progreso' && (
                <button onClick={() => handleStatusChange(inc.id, 'resuelto')} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition-colors text-white">
                  Resolver
                </button>
              )}
              {inc.status === 'resuelto' && (
                <button onClick={() => handleStatusChange(inc.id, 'cerrado')} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium transition-colors text-gray-700">
                  Cerrar
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No hay incidencias{filterStatus !== 'all' ? ` con estado "${filterStatus}"` : ''}.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editing ? 'Editar Incidencia' : 'Nueva Incidencia'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Título *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputStyle} placeholder="Descripción breve..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectStyle}>
                    <option value="produccion">Producción</option>
                    <option value="calidad">Calidad</option>
                    <option value="seguridad">Seguridad</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Severidad</label>
                  <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={selectStyle}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputStyle} rows={3} placeholder="Detalles adicionales..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowCreate(false); setEditing(null); setForm(emptyForm); }} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
                <button onClick={editing ? handleUpdate : handleCreate} disabled={!form.title} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-white">
                  {editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function MaterialsTab() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [bom, setBom] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMat, setEditMat] = useState<any>(null);
  const [bomModel, setBomModel] = useState('');
  const [form, setForm] = useState({ code: '', name: '', unit: 'uds', unit_cost: 0, category: '', supplier: '' });
  const [bomForm, setBomForm] = useState({ model_id: '', material_id: '', quantity: 1, waste_percent: 0 });

  async function load() {
    setLoading(true);
    try {
      const { listMaterials, listManufacturingModels } = await import('./api/admin-entities.js');
      const [mats, mods] = await Promise.all([listMaterials(), listManufacturingModels()]);
      setMaterials(mats); setModels(mods);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (bomModel) { import("./api/admin-entities.js").then(m => m.getBomForModel(bomModel)).then(setBom).catch(() => {}); } }, [bomModel]);

  async function saveMat() {
    try {
      const m = await import("./api/admin-entities.js");
      if (editMat) { await m.updateMaterial(editMat.id, form); } else { await m.createMaterial(form); }
      setShowForm(false); setEditMat(null);
      setForm({ code: '', name: '', unit: 'uds', unit_cost: 0, category: '', supplier: '' });
      void load();
    } catch (e: any) { setError(e.message); }
  }

  async function addBom() {
    if (!bomForm.model_id || !bomForm.material_id) return;
    try {
      const m = await import("./api/admin-entities.js");
      await m.upsertBomItem(bomForm);
      setBom(await m.getBomForModel(bomForm.model_id));
      setBomForm({ model_id: bomForm.model_id, material_id: '', quantity: 1, waste_percent: 0 });
    } catch (e: any) { setError(e.message); }
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>;
  const mats = materials;
  const cats = [...new Set(mats.filter(m => m.category).map(m => m.category))];

  return (
    <div>
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Catálogo de Materias Primas</h2>
        <button onClick={() => { setEditMat(null); setForm({ code: '', name: '', unit: 'uds', unit_cost: 0, category: '', supplier: '' }); setShowForm(!showForm); }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>
      {showForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">{editMat ? "Editar" : "Nueva"} Materia Prima</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div><label className="block text-xs text-gray-500 mb-1">Codigo</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="MAT-001" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Nombre</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Vidrio templado" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Unidad</label><select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-2 text-sm"><option>uds</option><option>kg</option><option>m</option><option>m2</option><option>L</option></select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Coste (&euro;)</label><input type="number" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: Number(e.target.value)})} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Categoria</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="vidrio / celula" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Proveedor</label><input value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" /></div>
          </div>
          <button onClick={saveMat} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editMat ? "Actualizar" : "Crear"}</button>
        </div>
      )}
      {cats.map(cat => (
        <div key={cat} className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">{cat}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mats.filter(m => m.category === cat).map(mat => (
              <div key={mat.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div><p className="font-medium text-gray-900">{mat.name}</p><p className="text-xs text-gray-500">{mat.code}</p></div>
                  <span className="text-sm font-semibold text-blue-600">{mat.unit_cost.toFixed(2)}€</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setEditMat(mat); setForm({code:mat.code,name:mat.name,unit:mat.unit,unit_cost:mat.unit_cost,category:mat.category||'',supplier:mat.supplier||''}); setShowForm(true); }}
                    className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200">Editar</button>
                  <button onClick={async () => { if (confirm("Eliminar?")) { (await import("./api/admin-entities.js")).deleteMaterial(mat.id); void load(); } }}
                    className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {cats.length === 0 && <p className="py-8 text-center text-gray-400">No hay materias primas.</p>}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">BOM &mdash; Materiales por Modelo</h2>
        <select value={bomModel} onChange={e => setBomModel(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Seleccionar modelo...</option>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {bomModel && (
          <>
            <div className="mb-4 flex gap-2">
              <select value={bomForm.material_id} onChange={e => setBomForm({...bomForm, material_id: e.target.value})}
                className="flex-[3] rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="">Añadir material...</option>
                {mats.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
              </select>
              <input type="number" placeholder="Cant" value={bomForm.quantity} onChange={e => setBomForm({...bomForm, quantity: Number(e.target.value)})}
                className="w-20 rounded border border-gray-300 px-3 py-2 text-sm" />
              <button onClick={addBom} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">+</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 pr-3">Codigo</th><th className="pb-2 pr-3">Material</th><th className="pb-2 pr-3">Cant</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {bom.map(b => (
                  <tr key={b.id} className="border-b border-gray-100 text-gray-700">
                    <td className="py-2 pr-3 text-gray-400">{b.material_code}</td>
                    <td className="py-2 pr-3">{b.material_name}</td>
                    <td className="py-2 pr-3">{b.quantity} {b.unit}</td>
                    <td className="py-2"><button onClick={async () => { await (await import("./api/admin-entities.js")).deleteBomItem(b.id); setBom(bom.filter(x => x.id !== b.id)); }} className="text-xs text-red-600">Eliminar</button></td>
                  </tr>
                ))}
                {bom.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sin materiales</td></tr>}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
