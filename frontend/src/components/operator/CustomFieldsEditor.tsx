import { inputTypeForField } from '../../utils/custom-field-values.js';

interface SchemaField {
  key: string;
  label?: string;
  type: string;
  required?: boolean;
  options?: string[];
}

interface Props {
  fields: SchemaField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
  isClassic?: boolean;
}

/**
 * Formulario para rellenar los campos personalizados de la orden activa.
 *
 * Antes estos campos solo se podían ver: el estado del formulario y el guardado
 * existían en el hook, pero no había ningún control que los usara, así que el
 * admin definía campos que nadie podía rellenar.
 */
export function CustomFieldsEditor({ fields, values, onChange, onSave, onCancel, saving, error, isClassic }: Props) {
  const label = isClassic
    ? 'text-xs font-semibold text-gray-600 mb-1 block'
    : 'text-xs font-bold uppercase tracking-wider text-kavana-steel mb-1 block';
  const control = isClassic
    ? 'w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900 focus:ring-kavana-orange focus:border-kavana-orange outline-none'
    : 'w-full bg-kavana-dark text-white border border-kavana-steel/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-kavana-orange';
  const card = isClassic ? 'border-gray-200 bg-gray-50' : 'border-kavana-steel/20 bg-kavana-surface';
  const btn = isClassic
    ? 'rounded px-3 py-1.5 text-sm font-medium bg-kavana-orange text-white hover:bg-kavana-orange-light disabled:opacity-40'
    : 'rounded-lg px-3 py-1.5 text-sm font-medium bg-kavana-orange text-white hover:brightness-110 disabled:opacity-40';
  const btnGhost = isClassic
    ? 'rounded px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100'
    : 'rounded-lg px-3 py-1.5 text-sm font-medium border border-kavana-steel/30 text-slate-300 hover:text-white';

  return (
    <div className={`mt-4 rounded-xl border p-4 ${card}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const tipo = inputTypeForField(field.type);
          const valor = values[field.key];
          const etiqueta = field.label || field.key;

          return (
            <div key={field.key}>
              <label className={label} htmlFor={`cf-${field.key}`}>
                {etiqueta}
                {field.required ? ' *' : ''}
              </label>

              {tipo === 'checkbox' ? (
                <input
                  id={`cf-${field.key}`}
                  type="checkbox"
                  checked={valor === true}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  className="h-4 w-4"
                />
              ) : tipo === 'select' ? (
                <select
                  id={`cf-${field.key}`}
                  value={typeof valor === 'string' ? valor : ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={control}
                >
                  <option value="">Sin elegir</option>
                  {(field.options ?? []).map((opcion) => (
                    <option key={opcion} value={opcion}>{opcion}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`cf-${field.key}`}
                  type={tipo}
                  value={typeof valor === 'string' ? valor : ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={control}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className={isClassic ? 'mt-3 text-sm text-red-700' : 'mt-3 text-sm text-rose-300'}>{error}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={onSave} disabled={saving} className={btn}>
          {saving ? 'Guardando...' : 'Guardar campos'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={btnGhost}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
