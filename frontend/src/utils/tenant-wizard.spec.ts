import { describe, expect, it } from 'vitest';
import {
  WIZARD_STEPS,
  type TenantWizardState,
  wizardInitialState,
  validateStep,
  canGoNext,
  nextStep,
  prevStep,
  buildCreateTenantPayload,
  normalizeSubdomain,
} from './tenant-wizard.js';

/**
 * Wizard de onboarding de tenant (tarea 3.1): máquina de estados pura que
 * guía al Global Admin en 3 pasos (datos → módulos → admin). La UI solo
 * renderiza; las reglas viven aquí y se testean sin DOM.
 */

const estadoBase: TenantWizardState = {
  step: 1,
  tenant: { id: 2, name: 'Acme Manufacturing', subdomain: 'acme', status: 'trial' },
  modules: ['core_mes', 'oee_monitoring'],
  admin: { admin_username: 'admin', admin_password: 'secreto123' },
};

describe('normalizeSubdomain', () => {
  it('pasa a minúsculas y quita lo que no sea a-z, 0-9 o guion', () => {
    expect(normalizeSubdomain('Acme Lux 24!')).toBe('acmelux24');
  });

  it('respeta los guiones existentes', () => {
    expect(normalizeSubdomain('Acme-Lux')).toBe('acme-lux');
  });
});

describe('validateStep', () => {
  it('paso 1: válido con los tres campos bien formados', () => {
    expect(validateStep(1, estadoBase)).toEqual([]);
  });

  it('paso 1: exige nombre, id numérico y subdominio', () => {
    const errores = validateStep(1, {
      ...estadoBase,
      tenant: { id: 0, name: '   ', subdomain: '', status: 'trial' },
    });
    expect(errores).toContain('name');
    expect(errores).toContain('id');
    expect(errores).toContain('subdomain');
  });

  it('paso 1: el id tiene que ser un entero positivo', () => {
    expect(validateStep(1, { ...estadoBase, tenant: { ...estadoBase.tenant, id: 2.5 } })).toContain('id');
    expect(validateStep(1, { ...estadoBase, tenant: { ...estadoBase.tenant, id: -1 } })).toContain('id');
  });

  it('paso 2: core_mes es obligatorio y siempre activo', () => {
    const errores = validateStep(2, { ...estadoBase, modules: [] });
    expect(errores).toContain('core_mes');
  });

  it('paso 2: válido con core_mes presente', () => {
    expect(validateStep(2, { ...estadoBase, modules: ['core_mes'] })).toEqual([]);
  });

  it('paso 3: exige usuario y password de 6 o más', () => {
    const errores = validateStep(3, {
      ...estadoBase,
      admin: { admin_username: '', admin_password: 'abc' },
    });
    expect(errores).toContain('admin_username');
    expect(errores).toContain('admin_password');
  });

  it('paso 3: password de 6 exactos es válido (límite del formulario actual)', () => {
    expect(
      validateStep(3, { ...estadoBase, admin: { admin_username: 'admin', admin_password: '123456' } }),
    ).toEqual([]);
  });
});

describe('navegación', () => {
  it('nextStep avanza solo si el paso actual es válido', () => {
    expect(nextStep(estadoBase).step).toBe(2);
    const bloqueado = nextStep({ ...estadoBase, tenant: { ...estadoBase.tenant, name: '' } });
    expect(bloqueado.step).toBe(1);
  });

  it('nextStep se detiene en el último paso (no crea por la cara)', () => {
    const alFinal = { ...estadoBase, step: 3 as const };
    expect(nextStep(alFinal).step).toBe(WIZARD_STEPS);
  });

  it('prevStep retrocede y no baja del primero', () => {
    expect(prevStep({ ...estadoBase, step: 2 as const }).step).toBe(1);
    expect(prevStep({ ...estadoBase, step: 1 as const }).step).toBe(1);
  });

  it('retroceder conserva los datos ya introducidos', () => {
    const ida = nextStep(estadoBase);
    const vuelta = prevStep(ida);
    expect(vuelta.tenant).toEqual(estadoBase.tenant);
    expect(vuelta.modules).toEqual(estadoBase.modules);
  });

  it('canGoNext refleja la validez del paso', () => {
    expect(canGoNext(estadoBase)).toBe(true);
    expect(canGoNext({ ...estadoBase, tenant: { ...estadoBase.tenant, subdomain: '' } })).toBe(false);
  });
});

describe('buildCreateTenantPayload', () => {
  it('produce el objeto exacto que espera createTenant', () => {
    const payload = buildCreateTenantPayload(estadoBase);
    expect(payload).toEqual({
      id: 2,
      name: 'Acme Manufacturing',
      subdomain: 'acme',
      status: 'trial',
      modules: ['core_mes', 'oee_monitoring'],
      admin_username: 'admin',
      admin_password: 'secreto123',
    });
  });

  it('core_mes siempre presente aunque no estuviera seleccionado', () => {
    const payload = buildCreateTenantPayload({ ...estadoBase, modules: [] });
    expect(payload.modules).toContain('core_mes');
    expect(payload.modules[0]).toBe('core_mes');
  });

  it('el estado inicial trae core_mes marcado y trial por defecto', () => {
    const inicial = wizardInitialState();
    expect(inicial.modules).toEqual(['core_mes']);
    expect(inicial.tenant.status).toBe('trial');
    expect(inicial.step).toBe(1);
  });
});
