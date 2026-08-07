import { useState, useEffect, useCallback } from 'react';
import { listWorkstations, createWorkstation, updateWorkstation, deleteWorkstation } from '../../api/admin-entities.js';
import type { Workstation } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { WORKSTATIONS_HELP } from '../../help-content.js';

interface Props { isClassic?: boolean; }

export function WorkstationsTab({ isClassic }: Props) {
  const [stations, setStations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', status: 'active' as 'active' | 'inactive' });

  const load = useCallback(async () => {
    try { setLoading(true); setStations(await listWorkstations()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate() {
    try { await createWorkstation(form); setForm({ name: '', status: 'active' }); setShowCreate(false); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function handleUpdate(id: string) {
    try { await updateWorkstation(id, form); setEditing(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este puesto?')) return;
    try { await deleteWorkstation(id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  const th = isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200' : 'px-4 py-3 text-left text-sm text-gray-400';
  const td = isClassic ? 'px-4 py-3 text-sm border-b border-gray-100' : 'px-4 py-3 text-sm border-b border-gray-700/50';
  const inp = isClassic ? 'border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white text-gray-900' : 'bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm w-full';
  const sel = isClassic ? 'border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white' : 'bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm';
  const btn = isClassic ? 'text-xs font-medium px-2 py-1 rounded transition-colors' : 'text-sm';
  const btnPrimary = isClassic ? `${btn} bg-kavana-orange text-white hover:bg-kavana-orange-light` : 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors';
  const btnSuccess = isClassic ? `${btn} bg-green-600 text-white hover:bg-green-700` : 'px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors';
  const btnGhost = isClassic ? `${btn} text-gray-500 hover:text-gray-700 hover:bg-gray-100` : 'px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors';
  const btnDanger = isClassic ? `${btn} text-red-600 hover:text-red-800 hover:bg-red-50` : 'text-red-400 hover:text-red-300 text-sm';
  const errBg = isClassic ? 'mx-4 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm' : 'bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm';
  const card = isClassic ? 'bg-white rounded-lg border border-gray-200 shadow-sm' : 'space-y-4';
  const tableBg = isClassic ? 'overflow-x-auto' : 'bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden';
  const label = isClassic ? 'text-sm font-semibold text-gray-700' : 'text-lg font-semibold';
  const loadingCls = isClassic ? 'px-4 py-8 text-center text-sm text-gray-400' : 'text-center py-8 text-gray-400';
  const statusBadge = (s: string) => {
    const base = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    if (isClassic) return `${base} ${s === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`;
    return `${base} ${s === 'active' ? 'bg-green-900/50 text-green-300' : 'bg-gray-600 text-gray-300'}`;
  };

  return (
    <div className={card}>
      <div className={isClassic ? 'px-4 py-3 border-b border-gray-200 flex items-center justify-between' : 'flex items-center justify-between'}>
        <div className="flex items-center gap-3">
          <h2 className={label}>Puestos de Trabajo</h2>
          <HelpModal {...WORKSTATIONS_HELP} theme={isClassic ? 'classic' : undefined} />
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setEditing(null); setForm({ name: '', status: 'active' }); }} className={btnPrimary}>
          + {isClassic ? 'Nuevo' : 'Nuevo Puesto'}
        </button>
      </div>

      {error && <div className={errBg}>{error}</div>}

      {showCreate && (
        <div className={isClassic ? 'mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3' : 'bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4 space-y-3'}>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre del puesto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={isClassic ? inp : 'bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent'} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className={isClassic ? sel : 'bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent'}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div className={isClassic ? 'flex gap-2 mt-3' : 'flex gap-2'}>
            <button onClick={handleCreate} className={btnSuccess}>Guardar</button>
            <button onClick={() => setShowCreate(false)} className={btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <div className={loadingCls}>Cargando...</div> : (
        <div className={tableBg}>
          <table className="w-full">
            <thead>
              <tr className={isClassic ? '' : 'border-b border-gray-700 text-left text-sm text-gray-400'}>
                <th className={th}>Nombre</th>
                <th className={th}>Estado</th>
                <th className={th}>Creado</th>
                <th className={`${th} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id} className={isClassic ? 'hover:bg-gray-50 transition-colors' : 'hover:bg-gray-700/30 transition-colors'}>
                  {editing === s.id ? (
                    <>
                      <td className={td}><input defaultValue={s.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></td>
                      <td className={td}><select defaultValue={s.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className={sel}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></td>
                      <td className={`${td} text-gray-400`}>—</td>
                      <td className={`${td} text-right space-x-1`}>
                        <button onClick={() => handleUpdate(s.id)} className={btnSuccess}>Guardar</button>
                        <button onClick={() => setEditing(null)} className={btnGhost}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${td} font-medium`}>{s.name}</td>
                      <td className={td}><span className={statusBadge(s.status)}>{s.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                      <td className={`${td} text-gray-400`}>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className={`${td} text-right space-x-1`}>
                        <button onClick={() => { setEditing(s.id); setForm({ name: s.name, status: s.status }); }} className={btnGhost}>Editar</button>
                        <button onClick={() => handleDelete(s.id)} className={btnDanger}>Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {stations.length === 0 && <tr><td colSpan={4} className={isClassic ? `${td} text-center text-gray-400 py-6` : 'px-4 py-8 text-center text-gray-500'}>No hay puestos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
