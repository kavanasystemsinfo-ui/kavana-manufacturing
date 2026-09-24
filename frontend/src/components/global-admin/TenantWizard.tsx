import { useState } from 'react';
import {
  WIZARD_STEPS,
  WIZARD_MODULES,
  wizardInitialState,
  validateStep,
  canGoNext,
  nextStep,
  prevStep,
  buildCreateTenantPayload,
  normalizeSubdomain,
  type TenantWizardState,
  type WizardField,
} from '../../utils/tenant-wizard.js';
import { createTenant } from '../../api/admin-entities.js';

const MODULE_LABELS: Record<string, string> = {
  core_mes: 'Core MES',
  oee_monitoring: 'OEE',
  quality_assurance: 'Calidad',
  cost_management: 'Costes',
};

const STEP_TITLES = ['Datos del cliente', 'Módulos', 'Administrador'] as const;

const inputClass =
  'w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-purple-400 focus:outline-none';
const labelClass = 'block text-sm font-medium text-gray-400 mb-1';

function fieldError(errores: WizardField[], campo: WizardField): boolean {
  return errores.includes(campo);
}

interface TenantWizardProps {
  onCreated: () => void;
  onError: (message: string | null) => void;
}

/**
 * Wizard de onboarding de tenant en 3 pasos (tarea 3.1). Sustituye al
 * formulario todo-en-uno: guía al Global Admin datos → módulos → admin.
 * Las reglas y la navegación viven en utils/tenant-wizard.ts (testeadas);
 * este componente solo renderiza y llama a createTenant.
 */
export function TenantWizard({ onCreated, onError }: TenantWizardProps) {
  const [state, setState] = useState<TenantWizardState>(wizardInitialState());
  const [creating, setCreating] = useState(false);
  const errores = validateStep(state.step, state);
  const puedeSiguiente = canGoNext(state);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      await createTenant(buildCreateTenantPayload(state));
      onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Nuevo cliente</h2>

      {/* Stepper */}
      <ol className="flex items-center gap-2" aria-label="Progreso del alta">
        {STEP_TITLES.map((titulo, i) => {
          const n = i + 1;
          const activo = state.step === n;
          const hecho = state.step > n;
          return (
            <li key={titulo} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  hecho
                    ? 'bg-green-600 text-white'
                    : activo
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400/50'
                      : 'bg-gray-700 text-gray-400'
                }`}
                aria-current={activo ? 'step' : undefined}
              >
                {hecho ? '✓' : n}
              </span>
              <span className={`text-xs ${activo ? 'text-white' : 'text-gray-500'}`}>{titulo}</span>
              {n < WIZARD_STEPS && <span className="mx-1 h-px w-6 bg-gray-600" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700 p-4 space-y-4">
        <p className="text-xs text-gray-500">
          Paso {state.step} de {WIZARD_STEPS} — {STEP_TITLES[state.step - 1]}
        </p>

        {state.step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="tw-id">ID del tenant</label>
                <input
                  id="tw-id"
                  type="number"
                  min={1}
                  value={state.tenant.id || ''}
                  onChange={(e) =>
                    setState({ ...state, tenant: { ...state.tenant, id: Number(e.target.value) } })
                  }
                  className={`${inputClass} ${fieldError(errores, 'id') ? 'border-red-500' : ''}`}
                />
                {fieldError(errores, 'id') && <p className="mt-1 text-xs text-red-400">Entero positivo</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="tw-status">Estado</label>
                <select
                  id="tw-status"
                  value={state.tenant.status}
                  onChange={(e) =>
                    setState({
                      ...state,
                      tenant: { ...state.tenant, status: e.target.value as TenantWizardState['tenant']['status'] },
                    })
                  }
                  className={inputClass}
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="tw-name">Nombre de la empresa</label>
              <input
                id="tw-name"
                placeholder="Ej: Acme Manufacturing"
                value={state.tenant.name}
                onChange={(e) => setState({ ...state, tenant: { ...state.tenant, name: e.target.value } })}
                className={`${inputClass} ${fieldError(errores, 'name') ? 'border-red-500' : ''}`}
              />
              {fieldError(errores, 'name') && <p className="mt-1 text-xs text-red-400">Obligatorio</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="tw-subdomain">Subdominio</label>
              <div className="flex items-center gap-0">
                <input
                  id="tw-subdomain"
                  placeholder="acme"
                  value={state.tenant.subdomain}
                  onChange={(e) =>
                    setState({
                      ...state,
                      tenant: { ...state.tenant, subdomain: normalizeSubdomain(e.target.value) },
                    })
                  }
                  className={`flex-1 bg-gray-900 text-white border border-gray-600 rounded-l-lg px-3 py-2 text-sm focus:border-purple-400 focus:outline-none ${
                    fieldError(errores, 'subdomain') ? 'border-red-500' : ''
                  }`}
                />
                <span className="bg-gray-700 text-gray-400 px-3 py-2 text-sm border border-l-0 border-gray-600 rounded-r-lg">
                  .kavana.app
                </span>
              </div>
              {fieldError(errores, 'subdomain') && <p className="mt-1 text-xs text-red-400">Obligatorio</p>}
            </div>
          </div>
        )}

        {state.step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Elige los módulos activos. Core MES es obligatorio.</p>
            <div className="flex flex-wrap gap-2">
              {WIZARD_MODULES.map((key) => {
                const seleccionado = state.modules.includes(key);
                const esCore = key === 'core_mes';
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={esCore}
                    onClick={() =>
                      setState({
                        ...state,
                        modules: seleccionado
                          ? state.modules.filter((m) => m !== key)
                          : [...state.modules, key],
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      seleccionado
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    } ${esCore ? 'cursor-default opacity-90' : ''}`}
                    title={esCore ? 'El núcleo del MES no se puede desactivar' : undefined}
                  >
                    {MODULE_LABELS[key] ?? key}
                    {esCore ? ' · obligatorio' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {state.step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Credenciales de acceso del administrador de <span className="text-white">{state.tenant.name}</span>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="tw-user">Usuario</label>
                <input
                  id="tw-user"
                  value={state.admin.admin_username}
                  onChange={(e) => setState({ ...state, admin: { ...state.admin, admin_username: e.target.value } })}
                  className={`${inputClass} ${fieldError(errores, 'admin_username') ? 'border-red-500' : ''}`}
                />
                {fieldError(errores, 'admin_username') && <p className="mt-1 text-xs text-red-400">Obligatorio</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="tw-pass">Contraseña</label>
                <input
                  id="tw-pass"
                  type="password"
                  value={state.admin.admin_password}
                  onChange={(e) => setState({ ...state, admin: { ...state.admin, admin_password: e.target.value } })}
                  className={`${inputClass} ${fieldError(errores, 'admin_password') ? 'border-red-500' : ''}`}
                  placeholder="Mínimo 6 caracteres"
                />
                {fieldError(errores, 'admin_password') && (
                  <p className="mt-1 text-xs text-red-400">Mínimo 6 caracteres</p>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-gray-900/50 p-3 text-xs text-gray-400">
              Se creará el cliente <span className="text-white">{state.tenant.name}</span> (
              {state.tenant.status}) con {state.modules.length} módulo
              {state.modules.length > 1 ? 's' : ''} y el usuario{' '}
              <span className="text-white">{state.admin.admin_username}</span>.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-700 pt-4">
          <button
            type="button"
            onClick={() => setState(prevStep(state))}
            disabled={state.step === 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
          >
            Anterior
          </button>
          {state.step < WIZARD_STEPS ? (
            <button
              type="button"
              onClick={() => setState(nextStep(state))}
              disabled={!puedeSiguiente}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={errores.length > 0 || creating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
            >
              {creating ? 'Creando…' : 'Crear cliente'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
