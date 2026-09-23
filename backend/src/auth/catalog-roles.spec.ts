import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { WorkstationsController } from '../workstations/workstations.controller.js';
import { ManufacturingModelsController } from '../manufacturing-models/manufacturing-models.controller.js';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';

/**
 * Contrato de roles de los catálogos que alimentan el formulario de nueva orden.
 *
 * El panel del supervisor pide `/workstations` y `/manufacturing-models` para
 * rellenar sus desplegables. Con el rol `tenant_admin` en la clase, el supervisor
 * recibía 403 en los dos y el formulario salía vacío: podía pulsar "Nueva Orden"
 * pero no había nada que elegir. El roadmap dice que el supervisor crea puestos y
 * órdenes, así que el permiso estaba en el sitio equivocado.
 *
 * Se comprueba la metadata que lee RolesGuard (método primero, clase después),
 * que es lo que decide de verdad el acceso.
 */
const reflector = new Reflector();

function rolesOf(prototype: object, method: string): string[] {
  const handler = (prototype as Record<string, unknown>)[method] as object;
  return (
    reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [
      handler,
      prototype.constructor as object,
    ]) ?? []
  );
}

describe('Catálogos del supervisor', () => {
  describe('workstations', () => {
    it('el supervisor puede listar los puestos para poder crear una orden', () => {
      expect(rolesOf(WorkstationsController.prototype, 'listWorkstations')).toContain('supervisor');
    });

    it('el supervisor puede crear un puesto de trabajo (flujo del roadmap)', () => {
      expect(rolesOf(WorkstationsController.prototype, 'createWorkstation')).toContain('supervisor');
    });

    it('borrar un puesto sigue siendo cosa del administrador del tenant', () => {
      const roles = rolesOf(WorkstationsController.prototype, 'deleteWorkstation');
      expect(roles).toContain('tenant_admin');
      expect(roles).not.toContain('supervisor');
    });
  });

  describe('manufacturing-models', () => {
    it('el supervisor puede listar los modelos para poder crear una orden', () => {
      expect(rolesOf(ManufacturingModelsController.prototype, 'listModels')).toContain('supervisor');
    });

    it('definir el catálogo de modelos sigue siendo cosa del administrador', () => {
      const roles = rolesOf(ManufacturingModelsController.prototype, 'createModel');
      expect(roles).toContain('tenant_admin');
      expect(roles).not.toContain('supervisor');
    });

    it('borrar un modelo sigue siendo cosa del administrador', () => {
      const roles = rolesOf(ManufacturingModelsController.prototype, 'deleteModel');
      expect(roles).toContain('tenant_admin');
      expect(roles).not.toContain('supervisor');
    });
  });
});
