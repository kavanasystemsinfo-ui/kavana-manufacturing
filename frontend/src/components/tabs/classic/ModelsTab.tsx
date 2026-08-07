import { useState, useEffect, useCallback, useRef } from 'react';
import { listManufacturingModels, createManufacturingModel, updateManufacturingModel, deleteManufacturingModel, fetchCapabilities } from '../../../api/admin-entities.js';
import type { ManufacturingModel } from '../../../api/admin-entities.js';
import { HelpModal } from '../../HelpModal.js';
import { MODELS_HELP } from '../../../help-content.js';


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

export function ModelsTab() {
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
        <div className="mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
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
