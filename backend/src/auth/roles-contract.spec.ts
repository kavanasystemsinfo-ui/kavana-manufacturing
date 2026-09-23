import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants.js';
import { PUBLIC_ROUTES } from './roles.guard.js';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';
import type { KavanaRole } from './tenant-context.interface.js';

import { CoreMesProductionController } from '../core-mes-production/core-mes-production.controller.js';
import { CostController } from '../cost/cost.controller.js';
import { GlobalAdminController } from '../global-admin/global-admin.controller.js';
import { IncidenciasController } from '../incidencias/incidencias.controller.js';
import { ManufacturingModelsController } from '../manufacturing-models/manufacturing-models.controller.js';
import { MaterialsController } from '../materials/materials.controller.js';
import { OeeController } from '../oee/oee.controller.js';
import { OrdersController } from '../orders/orders.controller.js';
import { QualityController } from '../quality/quality.controller.js';
import { TenantCapabilitiesController } from '../tenant-capabilities/tenant-capabilities.controller.js';
import { ToolingsController } from '../toolings/toolings.controller.js';
import { UsersController } from '../users/users.controller.js';
import { WorkstationsController } from '../workstations/workstations.controller.js';

/**
 * Contrato de roles de TODA la API, no solo de los catálogos del supervisor.
 *
 * El guard es fail-closed: un endpoint sin `@RequireRole` devuelve 403 a
 * cualquiera, incluido el administrador. Eso no se ve en los specs unitarios,
 * que mockean el servicio y nunca miran los decoradores, así que un permiso
 * olvidado solo aparece cuando lo sufre un usuario. Este test recorre cada
 * endpoint de cada controller y exige que su política esté declarada, en el
 * método o en la clase.
 *
 * Las tres excepciones son rutas públicas por diseño (están en PUBLIC_ROUTES del
 * guard): el login, el health y el asistente que usa la landing.
 */

const reflector = new Reflector();

/** Una clase de NestJS: aquí solo se usan su prototipo y su metadata. */
type ClaseControlador = { prototype: object };

const ROLES_VALIDOS: readonly KavanaRole[] = ['tenant_admin', 'supervisor', 'operario'];

/** Réplica de la comprobación del guard: una ruta pública no necesita política. */
function esPublica(controller: ClaseControlador, method: string): boolean {
  const prefijo = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '');
  const handler = (controller.prototype as Record<string, unknown>)[method] as object;
  const ruta = String(Reflect.getMetadata(PATH_METADATA, handler) ?? '');
  const completa = `/${prefijo}/${ruta}`;
  return [...PUBLIC_ROUTES].some((p) => completa.includes(`/${p}`));
}

/** Controllers con política de roles: todos los de dominio. */
const CONTROLLERS: ReadonlyArray<readonly [string, ClaseControlador]> = [
  ['core-mes-production', CoreMesProductionController],
  ['cost', CostController],
  ['global-admin', GlobalAdminController],
  ['incidencias', IncidenciasController],
  ['manufacturing-models', ManufacturingModelsController],
  ['materials', MaterialsController],
  ['oee', OeeController],
  ['orders', OrdersController],
  ['quality', QualityController],
  ['tenant-capabilities', TenantCapabilitiesController],
  ['toolings', ToolingsController],
  ['users', UsersController],
  ['workstations', WorkstationsController],
];

function rolesOf(prototype: object, method: string): string[] {
  const handler = (prototype as Record<string, unknown>)[method] as () => unknown;
  const roles = reflector.getAllAndOverride(REQUIRED_ROLES_KEY, [
    handler,
    prototype.constructor,
  ]) as string[] | undefined;
  return roles ?? [];
}

/** Métodos que NestJS expone como endpoint (tienen ruta declarada). */
function endpointsOf(controller: ClaseControlador): string[] {
  const prototype = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(prototype).filter((name) => {
    if (name === 'constructor') return false;
    const handler = prototype[name];
    return (
      typeof handler === 'function' &&
      Reflect.getMetadata(PATH_METADATA, handler as object) !== undefined
    );
  });
}

describe('Contrato de roles de la API', () => {
  describe.each(CONTROLLERS)('%s', (nombre, controller) => {
    it('tiene endpoints que analizar (si no, el test no prueba nada)', () => {
      expect(endpointsOf(controller).length).toBeGreaterThan(0);
    });

    it('cada endpoint declara su política: sin ella el guard cierra el acceso a todos', () => {
      const sinPolitica = endpointsOf(controller).filter(
        (m) => rolesOf(controller.prototype, m).length === 0 && !esPublica(controller, m),
      );
      expect(sinPolitica).toEqual([]);
    });

    it('solo declara roles conocidos', () => {
      for (const metodo of endpointsOf(controller)) {
        for (const rol of rolesOf(controller.prototype, metodo)) {
          expect(ROLES_VALIDOS, `${nombre}.${metodo}`).toContain(rol);
        }
      }
    });
  });

  describe('políticas de los endpoints que estaban cerrados a todos', () => {
    // El guard es fail-closed y estos endpoints no declaraban política, así que
    // devolvían 403 a TODO el mundo: el panel de incidencias no podía listar ni
    // crear nada, y las capacidades del tenant nunca llegaban al frontend (que
    // caía a su almacén local). Se fijan aquí las políticas por método.
    it('las capacidades del tenant las puede leer cualquier rol: cada panel las pide', () => {
      expect(rolesOf(TenantCapabilitiesController.prototype, 'getCapabilities')).toEqual([
        'operario',
        'supervisor',
        'tenant_admin',
      ]);
    });

    it('el catálogo de tipos de utillaje lo leen supervisor y administrador', () => {
      const roles = rolesOf(TenantCapabilitiesController.prototype, 'getToolingTypes');
      expect(roles).toContain('supervisor');
      expect(roles).toContain('tenant_admin');
      expect(roles).not.toContain('operario');
    });

    it('las incidencias las ven los tres roles: el operario ve las suyas', () => {
      expect(rolesOf(IncidenciasController.prototype, 'list')).toEqual([
        'operario',
        'supervisor',
        'tenant_admin',
      ]);
      expect(rolesOf(IncidenciasController.prototype, 'getById')).toContain('operario');
    });

    it('el operario reporta incidencias, que es para lo que existe el botón', () => {
      expect(rolesOf(IncidenciasController.prototype, 'create')).toContain('operario');
    });

    it('modificar una incidencia es de supervisor y administrador, no del operario', () => {
      const roles = rolesOf(IncidenciasController.prototype, 'update');
      expect(roles).toContain('supervisor');
      expect(roles).not.toContain('operario');
    });

    it('borrar una incidencia se queda en el administrador del tenant', () => {
      const roles = rolesOf(IncidenciasController.prototype, 'delete');
      expect(roles).toEqual(['tenant_admin']);
    });

    it('las estadísticas de incidencias no son para el operario', () => {
      const roles = rolesOf(IncidenciasController.prototype, 'stats');
      expect(roles).toContain('supervisor');
      expect(roles).not.toContain('operario');
    });
  });

  describe('rutas públicas por diseño', () => {
    it('la subida desde el móvil es pública (la credencial es el sessionId)', () => {
      // La página del móvil no tiene sesión: su credencial es un sessionId de un
      // solo uso. Lo que NO puede ser público es crear la sesión.
      expect([...PUBLIC_ROUTES]).toContain('upload-mobile');
      expect(rolesOf(IncidenciasController.prototype, 'createUploadSession')).toContain('operario');
    });

    it('el modal de subida del operario va autenticado, no público', () => {
      expect(rolesOf(IncidenciasController.prototype, 'getUploadSession')).toContain('operario');
      expect(rolesOf(IncidenciasController.prototype, 'getUploadPhoto')).toContain('operario');
    });
  });

  describe('el operario no administra catálogos', () => {
    const CATALOGOS: ReadonlyArray<readonly [string, ClaseControlador]> = [
      ['workstations', WorkstationsController],
      ['manufacturing-models', ManufacturingModelsController],
      ['materials', MaterialsController],
      ['toolings', ToolingsController],
      ['users', UsersController],
      ['tenant-capabilities', TenantCapabilitiesController],
    ];

    it.each(CATALOGOS)('%s: ningún endpoint de escritura admite operario', (_nombre, controller) => {
      const metodos = endpointsOf(controller).filter((m) => {
        // Los métodos de escritura de estos controllers se reconocen por su nombre
        // de acción; la ruta HTTP no basta porque Nest la guarda aparte.
        return /^(create|update|delete|save|toggle|assign)/i.test(m);
      });
      expect(metodos.length).toBeGreaterThan(0);
      for (const metodo of metodos) {
        expect(rolesOf(controller.prototype, metodo), metodo).not.toContain('operario');
      }
    });
  });
});
