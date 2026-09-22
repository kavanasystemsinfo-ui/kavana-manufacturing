import { useState, useEffect } from 'react';
import { fetchCapabilities, updateCustomFieldsSchema } from '../../api/admin-entities.js';
import type { TenantCapabilities } from '../../api/admin-entities.js';
import { HelpModal } from '../HelpModal.js';
import { CUSTOM_FIELDS_HELP } from '../../help-content.js';
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_ORDER,
  normalizeFieldKey,
  validateCustomFieldsDraft,
  type CustomFieldDraft,
} from '../../utils/custom-fields.js';

interface Props { isClassic?: boolean; }

function nuevaFila(): CustomFieldDraft {
  return { key: '', label: '', type: 'string', required: false };
}

export function CustomFieldsTab({ isClassic }: Props) {
  const [caps, setCaps] = useState<TenantCapabilities | null>(null);
  const [fields, setFields] = useState<CustomFieldDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetchCapabilities().then((c) => {
      setCaps(c);
      const fs = (c as any)?.customFieldsSchema?.production_orders?.fields || [];
      setFields(Array.isArray(fs) ? fs : []);
    }).catch((e) => setErrors([e instanceof Error ? e.message : String(e)])).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const problems = validateCustomFieldsDraft(fields);
    if (problems.length > 0) { setErrors(problems); return; }
    setSaving(true);
    try {
      await updateCustomFieldsSchema({ fields });
      setErrors([]);
      setSavedAt(Date.now());
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    } finally {
      setSaving(false);
    }
  };

  const add = () => { setFields([...fields, nuevaFila()]); setSavedAt(null); };
  const remove = (i: number) => { setFields(fields.filter((_, j) => j !== i)); setSavedAt(null); };
  const update = (i: number, p: Partial<CustomFieldDraft>) => {
    const next = [...fields];
    next[i] = { ...next[i], ...p };
    setFields(next);
    setSavedAt(null);
  };
  const move = (i: number, delta: number) => {
    const target = i + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[i], next[target]] = [next[target], next[i]];
    setFields(next);
    setSavedAt(null);
  };

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
  const hintCls = isClassic ? 'text-xs text-gray-500' : 'text-xs text-gray-400';

  const schemaPreview = JSON.stringify({ fields }, null, 2);

  return (
    <div className={isClassic ? '' : 'space-y-4'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className={label}>Campos Personalizados</h2>
          <HelpModal {...CUSTOM_FIELDS_HELP} theme={isClassic ? 'classic' : undefined} />
        </div>
        <button onClick={add} className={btnPrimary}>+ Añadir campo</button>
      </div>

      {errors.length > 0 && (
        <div className={errBg}>
          <ul className="list-disc space-y-1 pl-4">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {savedAt && !saving && errors.length === 0 && (
        <div className={isClassic ? 'text-sm text-green-700' : 'text-sm text-green-400'}>Esquema guardado.</div>
      )}

      <p className={hintCls}>
        La llave es el nombre con el que se guarda el dato y no admite espacios ni mayúsculas; se propone sola
        a partir del nombre. El orden de la lista es el orden en que los campos aparecen al operario.
      </p>

      {loading ? (
        <div className={isClassic ? 'text-sm text-gray-400 py-4' : 'text-center py-8 text-gray-400'}>Cargando...</div>
      ) : fields.length === 0 ? (
        <div className={isClassic ? 'text-sm text-gray-500 py-4' : 'text-center py-8 text-gray-500'}>
          Todavía no hay campos. Añade el primero que necesites pedir al operario.
        </div>
      ) : (
        <div className={isClassic ? 'bg-white border border-gray-200 rounded-lg overflow-hidden' : 'bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden'}>
          <table className="w-full">
            <thead>
              <tr className={isClassic ? 'border-b border-gray-200' : 'border-b border-gray-700'}>
                <th className={isClassic ? 'px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-2 py-3 text-left text-xs text-gray-400'}>Orden</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}>Llave</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}>Nombre</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}>Tipo</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}>Obligatorio</th>
                <th className={isClassic ? 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase' : 'px-4 py-3 text-left text-sm text-gray-400'}></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={i} className={isClassic ? 'border-b border-gray-100 align-top' : 'border-b border-gray-700/50 align-top'}>
                  <td className="px-2 py-2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label={`Subir ${f.label || f.key || `fila ${i + 1}`}`}
                        className={`${btnSm} disabled:opacity-30`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === fields.length - 1}
                        aria-label={`Bajar ${f.label || f.key || `fila ${i + 1}`}`}
                        className={`${btnSm} disabled:opacity-30`}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={f.key}
                      onChange={(e) => update(i, { key: e.target.value })}
                      onBlur={(e) => update(i, { key: normalizeFieldKey(e.target.value) })}
                      aria-label={`Llave de la fila ${i + 1}`}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-4 py-2"><input value={f.label} onChange={(e) => update(i, { label: e.target.value })} className={inputCls} /></td>
                  <td className="px-4 py-2">
                    <select value={f.type} onChange={(e) => update(i, { type: e.target.value })} className={selectCls}>
                      {FIELD_TYPE_ORDER.map((type) => (
                        <option key={type} value={type}>{FIELD_TYPE_LABELS[type]}</option>
                      ))}
                    </select>
                    {f.type === 'select' && (
                      <input
                        value={(f.options ?? []).join(', ')}
                        onChange={(e) =>
                          update(i, {
                            options: e.target.value === '' ? [] : e.target.value.split(',').map((o) => o.trimStart()),
                          })
                        }
                        placeholder="Opciones separadas por comas"
                        aria-label={`Opciones de la fila ${i + 1}`}
                        className={`${inputCls} mt-1`}
                      />
                    )}
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

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Guardando...' : 'Guardar esquema'}</button>
      </div>

      {fields.length > 0 && (
        <details className={isClassic ? 'text-sm' : 'text-sm text-gray-300'}>
          <summary className={hintCls}>Ver lo que se guarda (solo lectura)</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-300">{schemaPreview}</pre>
        </details>
      )}

      {caps === null && !loading && (
        <p className={hintCls}>No se pudo leer la configuración actual; revisa el error de arriba antes de guardar.</p>
      )}
    </div>
  );
}
