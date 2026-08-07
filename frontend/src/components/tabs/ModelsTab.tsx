import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { listWorkstations, listManufacturingModels, createManufacturingModel, updateManufacturingModel, deleteManufacturingModel, fetchCapabilities } from '../../api/admin-entities.js';
import type { ManufacturingModel, Workstation } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { MODELS_HELP } from '../../help-content.js';

interface Props { isClassic?: boolean; }

export function ModelsTab({ isClassic }: Props) {
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

  const btn = isClassic ? "text-xs font-medium px-2 py-1 rounded transition-colors" : "text-sm";
  const btnPrimary = isClassic ? btn + " bg-kavana-orange text-white hover:bg-kavana-orange-light" : "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors";
  const btnSuccess = isClassic ? btn + " bg-green-600 text-white hover:bg-green-700" : "px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors";
  const btnGhost = isClassic ? btn + " text-gray-500 hover:text-gray-700 hover:bg-gray-100" : "px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors";
  const btnDanger = isClassic ? btn + " text-red-600 hover:text-red-800 hover:bg-red-50" : "text-red-400 hover:text-red-300 text-sm";

  return (
    <div className={isClassic ? "bg-white rounded-lg border border-gray-200 shadow-sm" : "space-y-4"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className={isClassic ? "text-sm font-semibold text-gray-700" : "text-lg font-semibold"}>Modelos de Manufactura</h2>
          <HelpModal {...MODELS_HELP} theme={isClassic ? "classic" : undefined} />
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditing(null); setForm({ name: '', unit_of_measure: undefined, target_rate: undefined, workstation_id: undefined }); }}
          className={isClassic ? btnPrimary : "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"}
        >
          + Nuevo Modelo
        </button>
      </div>

      {error && <div className={isClassic ? "bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm" : "bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm"}>{error}</div>}

      {showCreate && (
        <div className={isClassic ? "bg-white border border-gray-200 rounded-lg p-4 shadow-sm" : "bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4 space-y-3"}>
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
            <button onClick={handleCreate} className={isClassic ? btnSuccess : "px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"}>Guardar</button>
            <button onClick={() => setShowCreate(false)} className={isClassic ? btnGhost : "px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={isClassic ? "px-4 py-8 text-center text-sm text-gray-400" : "text-center py-8 text-gray-400"}>Cargando...</div>
      ) : (
        <div className={isClassic ? "overflow-x-auto" : "bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden"}>
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
