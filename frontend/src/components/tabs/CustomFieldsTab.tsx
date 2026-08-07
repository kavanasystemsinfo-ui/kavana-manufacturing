import { useState, useEffect } from 'react';
import { fetchCapabilities, updateCustomFieldsSchema } from '../../api/admin-entities.js';
import type { TenantCapabilities } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { CUSTOM_FIELDS_HELP } from '../../help-content.js';

interface EditableField { key: string; label: string; type: 'string' | 'number' | 'boolean'; required: boolean; }

interface Props { isClassic?: boolean; }

export function CustomFieldsTab({ isClassic }: Props) {
  const [caps, setCaps] = useState<TenantCapabilities | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchCapabilities().then((c) => {
      setCaps(c);
      const fs = (c as any)?.customFieldsSchema?.production_orders?.fields || [];
      setFields(Array.isArray(fs) ? fs : []);
    }).catch((e) => setErr(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const keys = fields.map((f) => f.key.trim());
    if (keys.some((k) => !k)) { setErr('Todas las llaves deben tener nombre.'); return; }
    if (new Set(keys).size !== keys.length) { setErr('No se permiten llaves duplicadas.'); return; }
    setSaving(true);
    try { await updateCustomFieldsSchema({ fields }); setErr(null); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  const add = () => setFields([...fields, { key: '', label: '', type: 'string', required: false }]);
  const remove = (i: number) => setFields(fields.filter((_, j) => j !== i));
  const update = (i: number, p: Partial<EditableField>) => { const f = [...fields]; f[i] = { ...f[i], ...p }; setFields(f); };

  const label = isClassic ? 'text-sm font-semibold text-gray-700' : 'text-lg font-semibold';
  const inputCls = isClassic
    ? 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white text-gray-900'
    : 'bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500';
  const selectCls = isClassic
    ? 'border border-gray-300 rounded px-2 py-1 text-sm focus:ring-kavana-orange focus:border-kavana-orange outline-none bg-white'
    : 'bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm';
  const btnSm = 'text-xs font-medium px-2 py-1 rounded transition-colors';
  const btnPrimary = isClassic ? `${btnSm} bg-kavana-orange text-white hover:bg-kavana-orange-light` : `px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors`;
  const btnDanger = isClassic ? `${btnSm} text-red-600 hover:text-red-800 hover:bg-red-50` : 'text-red-400 hover:text-red-300 text-sm';
  const errBg = isClassic ? 'bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700 text-sm' : 'bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm';

  return (
    <div className={isClassic ? '' : 'space-y-4'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className={label}>Campos Personalizados</h2>
          <HelpModal {...CUSTOM_FIELDS_HELP} theme={isClassic ? 'classic' : undefined} />
        </div>
        <button onClick={add} className={btnPrimary}>+ Añadir campo</button>
      </div>
      {err && <div className={errBg}>{err}</div>}
      {loading ? <div className={isClassic ? 'text-sm text-gray-400 py-4' : 'text-center py-8 text-gray-400'}>Cargando...</div>
      : (
        <div className={isClassic ? 'bg-white border border-gray-200 rounded-lg overflow-hidden' : 'bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden'}>
          <table className="w-full">
            <thead>
              <tr className={isClassic ? 'border-b border-gray-200' : 'border-b border-gray-700'}>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}>Key</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}>Label</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}>Tipo</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}>Req</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={i} className={isClassic ? 'border-b border-gray-100' : 'border-b border-gray-700/50'}>
                  <td className="px-4 py-2"><input value={f.key} onChange={(e) => update(i, { key: e.target.value })} className={inputCls} /></td>
                  <td className="px-4 py-2"><input value={f.label} onChange={(e) => update(i, { label: e.target.value })} className={inputCls} /></td>
                  <td className="px-4 py-2">
                    <select value={f.type} onChange={(e) => update(i, { type: e.target.value as any })} className={selectCls}>
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} />
                  </td>
                  <td className="px-4 py-2"><button onClick={() => remove(i)} className={btnDanger}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Guardando...' : 'Guardar esquema'}</button>
    </div>
  );
}
