/**
 * Wizard de onboarding de tenant (tarea 3.1): máquina de estados pura.
 *
 * Los 3 pasos guiados sustituyen al formulario todo-en-uno del panel de
 * Global Admin: 1) datos del tenant, 2) módulos, 3) credenciales del admin.
 * El objetivo del plan es crear tenant+módulos+admin en menos de 2 minutos
 * sin conocer el esquema de `createTenant` de memoria.
 *
 * Las reglas replican las del formulario anterior (mismas validaciones,
 * cero cambios de contrato) y `core_mes` es obligatorio: es el módulo del
 * core del MES, sin él el tenant no puede registrar producción.
 */

export const WIZARD_STEPS = 3;

export interface TenantWizardTenant {
  id: number;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
}

export interface TenantWizardAdmin {
  admin_username: string;
  admin_password: string;
}

export interface TenantWizardState {
  step: 1 | 2 | 3;
  tenant: TenantWizardTenant;
  modules: string[];
  admin: TenantWizardAdmin;
}

/** Claves de campo inválido, reutilizables por la UI para marcar inputs. */
export type WizardField = 'id' | 'name' | 'subdomain' | 'core_mes' | 'admin_username' | 'admin_password';

export const WIZARD_MODULES: readonly string[] = [
  'core_mes',
  'oee_monitoring',
  'quality_assurance',
  'cost_management',
];

export function wizardInitialState(): TenantWizardState {
  return {
    step: 1,
    tenant: { id: 2, name: '', subdomain: '', status: 'trial' },
    // core_mes es obligatorio: nace marcado y no se puede desmarcar.
    modules: ['core_mes'],
    admin: { admin_username: 'admin', admin_password: '' },
  };
}

export function normalizeSubdomain(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function validateStep(step: number, state: TenantWizardState): WizardField[] {
  const errores: WizardField[] = [];
  if (step === 1) {
    if (!state.tenant.name.trim()) errores.push('name');
    if (!Number.isInteger(state.tenant.id) || state.tenant.id <= 0) errores.push('id');
    if (!normalizeSubdomain(state.tenant.subdomain).trim()) errores.push('subdomain');
  }
  if (step === 2) {
    if (!state.modules.includes('core_mes')) errores.push('core_mes');
  }
  if (step === 3) {
    if (!state.admin.admin_username.trim()) errores.push('admin_username');
    if (state.admin.admin_password.trim().length < 6) errores.push('admin_password');
  }
  return errores;
}

export function canGoNext(state: TenantWizardState): boolean {
  return validateStep(state.step, state).length === 0 && state.step < WIZARD_STEPS;
}

/** Avanza solo con el paso válido: la UI no puede saltarse validación. */
export function nextStep(state: TenantWizardState): TenantWizardState {
  if (!canGoNext(state)) return state;
  return { ...state, step: (state.step + 1) as TenantWizardState['step'] };
}

export function prevStep(state: TenantWizardState): TenantWizardState {
  if (state.step <= 1) return state;
  return { ...state, step: (state.step - 1) as TenantWizardState['step'] };
}

export interface CreateTenantPayload {
  id: number;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  modules: string[];
  admin_username: string;
  admin_password: string;
}

/**
 * Objeto exacto que espera `createTenant` (api/admin-entities.ts). core_mes
 * va primero y siempre presente (el backend lo añadiría por defecto, pero el
 * wizard lo garantiza explícito).
 */
export function buildCreateTenantPayload(state: TenantWizardState): CreateTenantPayload {
  const modules = state.modules.includes('core_mes')
    ? state.modules
    : ['core_mes', ...state.modules];
  return {
    id: state.tenant.id,
    name: state.tenant.name.trim(),
    subdomain: normalizeSubdomain(state.tenant.subdomain),
    status: state.tenant.status,
    modules,
    admin_username: state.admin.admin_username.trim(),
    admin_password: state.admin.admin_password,
  };
}
