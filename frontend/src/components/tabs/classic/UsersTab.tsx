import { useState, useEffect, useCallback, useRef } from 'react';
import { listUsers, createUser, updateUser, deleteUser, listWorkstations } from '../../../api/admin-entities.js';
import type { User, Workstation } from '../../../api/admin-entities.js';
import { HelpModal } from '../../HelpModal.js';
import { USERS_HELP } from '../../../help-content.js';


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

export function UsersTab() {
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
      supervisor: 'bg-orange-100 text-orange-700',
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
        <div className="mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
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
                      <td className={`${tdStyle} text-gray-500`}>{catLabels[u.operator_category ?? 'peon_especialista'] ?? '—'}</td>
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
