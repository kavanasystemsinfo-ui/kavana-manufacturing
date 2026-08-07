import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { User, Workstation, ManufacturingModel, Order, Tooling, Incidencia, IncidenciaStats, TenantCapabilities, BomItem } from '../../api/admin-entities.js';
import { listUsers, createUser, updateUser, deleteUser, listWorkstations } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { USERS_HELP } from '../../help-content.js';

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