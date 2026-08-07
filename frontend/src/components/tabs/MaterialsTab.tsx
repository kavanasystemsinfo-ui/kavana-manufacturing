import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { listManufacturingModels, listMaterials, createMaterial, updateMaterial, deleteMaterial, deleteBomItem } from '../../api/admin-entities.js';

export function MaterialsTab() {
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
      const { listMaterials, listManufacturingModels } = await import('../../api/admin-entities.js');
      const [mats, mods] = await Promise.all([listMaterials(), listManufacturingModels()]);
      setMaterials(mats);
      setModels(mods);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (bomModel) {
      import('../../api/admin-entities.js').then(m => m.getBomForModel(bomModel)).then(setBom).catch(() => {});
    }
  }, [bomModel]);

  async function saveMat() {
    try {
      const m = await import('../../api/admin-entities.js');
      if (editMat) { await m.updateMaterial(editMat.id, form); }
      else { await m.createMaterial(form); }
      setShowForm(false); setEditMat(null);
      setForm({ code: '', name: '', unit: 'uds', unit_cost: 0, category: '', supplier: '' });
      void load();
    } catch (e: any) { setError(e.message); }
  }

  async function addBom() {
    if (!bomForm.model_id || !bomForm.material_id) return;
    try {
      await (await import('../../api/admin-entities.js')).upsertBomItem(bomForm);
      setBom(await (await import('../../api/admin-entities.js')).getBomForModel(bomForm.model_id));
      setBomForm({ model_id: bomForm.model_id, material_id: '', quantity: 1, waste_percent: 0 });
    } catch (e: any) { setError(e.message); }
  }

  if (loading) return <div className="p-8 text-gray-400">Cargando...</div>;

  const mats = materials;
  const cats = [...new Set(mats.filter(m => m.category).map(m => m.category))];

  return (
    <div>
      {error && <div className="mb-4 rounded bg-red-500/20 p-3 text-sm text-red-300 ring-1 ring-red-500/40">{error}</div>}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Catálogo de Materias Primas</h2>
        <button onClick={() => { setEditMat(null); setForm({ code: '', name: '', unit: 'uds', unit_cost: 0, category: '', supplier: '' }); setShowForm(!showForm); }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800/80 p-4">
          <h3 className="mb-4 text-sm font-bold text-indigo-400">{editMat ? 'Editar' : 'Nueva'} Materia Prima</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Código</label>
              <input value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white" placeholder="MAT-001" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Nombre</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white" placeholder="Vidrio templado" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Unidad</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white">
                <option>uds</option><option>kg</option><option>m</option><option>m2</option><option>L</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Coste (€/unidad)</label>
              <input type="number" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: Number(e.target.value)})}
                className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Categoría</label>
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white" placeholder="vidrio / celula" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Proveedor</label>
              <input value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})}
                className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white" />
            </div>
          </div>
          <button onClick={saveMat}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">
            {editMat ? 'Actualizar' : 'Crear'} Materia Prima
          </button>
        </div>
      )}

      {cats.map(cat => (
        <div key={cat} className="mb-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-400">{cat}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mats.filter(m => m.category === cat).map(mat => (
              <div key={mat.id} className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white">{mat.name}</p>
                    <p className="text-xs text-gray-400">{mat.code} / {mat.unit}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-400">{mat.unit_cost.toFixed(2)}€</span>
                </div>
                {mat.supplier && <p className="mt-1 text-xs text-gray-500">{mat.supplier}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setEditMat(mat); setForm({ code: mat.code, name: mat.name, unit: mat.unit, unit_cost: mat.unit_cost, category: mat.category || '', supplier: mat.supplier || '' }); setShowForm(true); }}
                    className="rounded bg-blue-600/20 px-2 py-1 text-xs text-blue-400 hover:bg-blue-600/30">Editar</button>
                  <button onClick={async () => { if (confirm('Eliminar?')) { await (await import('../../api/admin-entities.js')).deleteMaterial(mat.id); void load(); } }}
                    className="rounded bg-red-600/20 px-2 py-1 text-xs text-red-400 hover:bg-red-600/30">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {cats.length === 0 && <p className="py-8 text-center text-gray-500">No hay materias primas. Crea la primera.</p>}

      {/* BOM */}
      <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800/60 p-4">
        <h2 className="mb-4 text-lg font-bold text-white">BOM — Materiales por Modelo</h2>
        <div className="mb-4">
          <select value={bomModel} onChange={e => setBomModel(e.target.value)}
            className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white">
            <option value="">Seleccionar modelo...</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        {bomModel && (
          <>
            <div className="mb-4 flex gap-2">
              <select value={bomForm.material_id} onChange={e => setBomForm({...bomForm, material_id: e.target.value})}
                className="flex-[3] rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white">
                <option value="">Añadir material...</option>
                {mats.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
              </select>
              <input type="number" placeholder="Cant" value={bomForm.quantity} onChange={e => setBomForm({...bomForm, quantity: Number(e.target.value)})}
                className="w-20 rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white" />
              <input type="number" placeholder="% desp" value={bomForm.waste_percent} onChange={e => setBomForm({...bomForm, waste_percent: Number(e.target.value)})}
                className="w-20 rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white" />
              <button onClick={addBom}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-500">+</button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="pb-2 pr-3">Código</th><th className="pb-2 pr-3">Material</th>
                  <th className="pb-2 pr-3">Cant</th><th className="pb-2 pr-3">Ud</th><th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {bom.map(b => (
                  <tr key={b.id} className="border-b border-gray-800 text-white">
                    <td className="py-2 pr-3 text-gray-400">{b.material_code}</td>
                    <td className="py-2 pr-3">{b.material_name}</td>
                    <td className="py-2 pr-3">{b.quantity}</td>
                    <td className="py-2 pr-3 text-gray-400">{b.unit}</td>
                    <td className="py-2">
                      <button onClick={async () => { await (await import('../../api/admin-entities.js')).deleteBomItem(b.id); setBom(bom.filter(x => x.id !== b.id)); }}
                        className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                    </td>
                  </tr>
                ))}
                {bom.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-500">Sin materiales</td></tr>}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
