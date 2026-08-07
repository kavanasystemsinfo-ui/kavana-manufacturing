import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { listWorkstations, createWorkstation, updateWorkstation, deleteWorkstation } from '../../api/admin-entities.js';
import type { Workstation } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { WORKSTATIONS_HELP } from '../../help-content.js';

export function WorkstationsTab() {
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
