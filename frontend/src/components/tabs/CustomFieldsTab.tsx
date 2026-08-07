import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchCapabilities, updateCustomFieldsSchema } from '../../api/admin-entities.js';
import type { TenantCapabilities } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { CUSTOM_FIELDS_HELP } from '../../help-content.js';

interface EditableField { key: string; label: string; type: "string" | "number" | "boolean"; required: boolean; }

export function CustomFieldsTab() {
  const [capabilities, setCapabilities] = useState<TenantCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCapabilities().then((data) => {
      setCapabilities(data);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Campos Personalizados (Órdenes)</h2>
          <HelpModal {...CUSTOM_FIELDS_HELP} />
        </div>
        <button onClick={addField} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
          + Campo
        </button>
      </div>
      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {fields.map((f, idx) => (
            <div key={idx} className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4 flex items-center gap-3">
              <input placeholder="clave" value={f.key} onChange={(e) => updateField(idx, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm w-40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500" />
              <input placeholder="etiqueta" value={f.label ?? ''} onChange={(e) => updateField(idx, { label: e.target.value })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm w-40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500" />
              <select value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as EditableField['type'] })} className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="string">Texto</option>
                <option value="number">Número</option>
                <option value="boolean">Booleano</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={f.required} onChange={(e) => updateField(idx, { required: e.target.checked })} className="rounded border-gray-600 bg-gray-900 text-indigo-500 focus:ring-indigo-500" />
                Requerido
              </label>
              <button onClick={() => removeField(idx)} className="ml-auto text-red-400 hover:text-red-300 text-sm">Eliminar</button>
            </div>
          ))}
          {fields.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay campos personalizados definidos</div>
          )}
          {fields.length > 0 && (
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar Esquema'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
