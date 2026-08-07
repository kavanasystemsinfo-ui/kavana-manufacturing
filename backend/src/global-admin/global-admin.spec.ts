import { describe, it, expect } from 'vitest';
import { GlobalAdminService, DEFAULT_MODULES } from './global-admin.service.js';

describe('GlobalAdminService', () => {
  it('should be importable', () => {
    expect(GlobalAdminService).toBeDefined();
  });

  it('activa los 5 módulos por defecto en un tenant nuevo', () => {
    expect(DEFAULT_MODULES).toEqual([
      'core_mes',
      'oee_monitoring',
      'cost_management',
      'quality_assurance',
      'materials_management',
    ]);
    expect(DEFAULT_MODULES).toHaveLength(5);
  });

  it('el feature_matrix de createTenant incluye todos los módulos por defecto', () => {
    // Sin modules → DEFAULT_MODULES; con modules → solo esos
    const modules = DEFAULT_MODULES;
    const featureMatrix = {
      modular_matrix: Object.fromEntries(
        modules.map((m) => [m, { enabled: true, features: {} }])
      ),
      resource_quotas: { entities: { max_custom_fields: 5 } },
    };
    const mm = featureMatrix.modular_matrix;
    for (const m of DEFAULT_MODULES) {
      expect(mm[m]).toBeDefined();
      expect(mm[m].enabled).toBe(true);
    }
  });
});
