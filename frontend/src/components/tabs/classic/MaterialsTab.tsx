import { useState, useEffect, useCallback, useRef } from 'react';
import { listManufacturingModels, listMaterials, createMaterial, updateMaterial, deleteMaterial, deleteBomItem } from '../../../api/admin-entities.js';


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
      const { listMaterials, listManufacturingModels } = await import('../../../api/admin-entities.js');
      const [mats, mods] = await Promise.all([listMaterials(), listManufacturingModels()]);
      setMaterials(mats); setModels(mods);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (bomModel) { import("../../../api/admin-entities.js").then(m => m.getBomForModel(bomModel)).then(setBom).catch(() => {}); } }, [bomModel]);

  async function saveMat() {
    try {
      const m = await import("../../../api/admin-entities.js");
      if (editMat) { await m.updateMaterial(editMat.id, form); } else { await m.createMaterial(form); }
      setShowForm(false); setEditMat(null);
      setForm({ code: '', name: '', unit: 'uds', unit_cost: 0, category: '', supplier: '' });
      void load();
    } catch (e: any) { setError(e.message); }
  }

  async function addBom() {
    if (!bomForm.model_id || !bomForm.material_id) return;
    try {
      const m = await import("../../../api/admin-entities.js");
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
          className="rounded-md bg-kavana-orange px-4 py-2 text-sm font-medium text-white hover:bg-kavana-orange-light">
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
          <button onClick={saveMat} className="mt-4 rounded-md bg-kavana-orange px-4 py-2 text-sm font-medium text-white hover:bg-kavana-orange-light">{editMat ? "Actualizar" : "Crear"}</button>
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
                  <span className="text-sm font-semibold text-kavana-orange">{mat.unit_cost.toFixed(2)}€</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setEditMat(mat); setForm({code:mat.code,name:mat.name,unit:mat.unit,unit_cost:mat.unit_cost,category:mat.category||'',supplier:mat.supplier||''}); setShowForm(true); }}
                    className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700 hover:bg-orange-200">Editar</button>
                  <button onClick={async () => { if (confirm("Eliminar?")) { (await import("../../../api/admin-entities.js")).deleteMaterial(mat.id); void load(); } }}
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
                    <td className="py-2"><button onClick={async () => { await (await import("../../../api/admin-entities.js")).deleteBomItem(b.id); setBom(bom.filter(x => x.id !== b.id)); }} className="text-xs text-red-600">Eliminar</button></td>
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
