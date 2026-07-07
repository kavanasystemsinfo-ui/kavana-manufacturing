import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ManufacturingModelsController } from './manufacturing-models.controller.js';
import { ManufacturingModelsService } from './manufacturing-models.service.js';
import { NotFoundException } from '@nestjs/common';
import * as tenantContext from '../auth/tenant-context.storage.js';
import { tenantQuery } from '../db/tenant-query.js';

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

vi.mock('../db/postgres.provider.js', () => ({
  postgresPool: {},
}));

vi.mock('../db/tenant-query.js', () => ({
  tenantQuery: vi.fn(),
}));

describe('ManufacturingModelsController', () => {
  let controller: ManufacturingModelsService;
  let service: ManufacturingModelsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = {
      createModel: vi.fn(),
      listModels: vi.fn(),
      getModel: vi.fn(),
      updateModel: vi.fn(),
      deleteModel: vi.fn(),
    } as unknown as ManufacturingModelsService;
    controller = new ManufacturingModelsController(service);
  });

  describe('createModel', () => {
    it('creates a model with valid data', async () => {
      const dto = { name: 'Prensa Estándar', unit_of_measure: 'piezas/h' as const };
      const expected = { id: 'model-1', ...dto, tenant_id: 10n, created_at: new Date() };
      vi.spyOn(service, 'createModel').mockResolvedValue(expected);

      const result = await controller.createModel(dto);

      expect(result).toEqual(expected);
      expect(service.createModel).toHaveBeenCalledWith(dto);
    });

    it('rejects empty name', async () => {
      const dto = { name: '', unit_of_measure: 'piezas/h' as const };
      
      await expect(controller.createModel(dto)).rejects.toThrow();
    });
  });

  describe('listModels', () => {
    it('returns list of models', async () => {
      const models = [
        { id: 'model-1', name: 'Prensa Estándar', unit_of_measure: 'piezas/h', tenant_id: 10n },
        { id: 'model-2', name: 'Corte Rápido', unit_of_measure: 'm/h', tenant_id: 10n },
      ];
      vi.spyOn(service, 'listModels').mockResolvedValue(models);

      const result = await controller.listModels();

      expect(result).toEqual(models);
      expect(service.listModels).toHaveBeenCalled();
    });

    it('returns empty list when no models exist', async () => {
      vi.spyOn(service, 'listModels').mockResolvedValue([]);

      const result = await controller.listModels();

      expect(result).toEqual([]);
    });
  });

  describe('getModel', () => {
    it('returns a model by id', async () => {
      const model = { id: 'model-1', name: 'Prensa Estándar', unit_of_measure: 'piezas/h', tenant_id: 10n };
      vi.spyOn(service, 'getModel').mockResolvedValue(model);

      const result = await controller.getModel('model-1');

      expect(result).toEqual(model);
      expect(service.getModel).toHaveBeenCalledWith('model-1');
    });

    it('throws NotFoundException when model not found', async () => {
      vi.spyOn(service, 'getModel').mockResolvedValue(null);

      await expect(controller.getModel('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateModel', () => {
    it('updates a model with valid data', async () => {
      const dto = { unit_of_measure: 'kg/h' as const };
      const updated = { id: 'model-1', name: 'Prensa Estándar', unit_of_measure: 'kg/h', tenant_id: 10n };
      vi.spyOn(service, 'updateModel').mockResolvedValue(updated);

      const result = await controller.updateModel('model-1', dto);

      expect(result).toEqual(updated);
      expect(service.updateModel).toHaveBeenCalledWith('model-1', dto);
    });

    it('throws NotFoundException when model not found', async () => {
      vi.spyOn(service, 'updateModel').mockResolvedValue(null);

      await expect(controller.updateModel('nonexistent', { unit_of_measure: 'L/h' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteModel', () => {
    it('deletes a model', async () => {
      vi.spyOn(service, 'deleteModel').mockResolvedValue(true);

      const result = await controller.deleteModel('model-1');
      expect(result).toEqual({ deleted: true });
      expect(service.deleteModel).toHaveBeenCalledWith('model-1');
    });

    it('throws NotFoundException when model not found', async () => {
      vi.spyOn(service, 'deleteModel').mockResolvedValue(false);

      await expect(controller.deleteModel('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('ManufacturingModelsService', () => {
  let service: ManufacturingModelsService;
  const mockTenantQuery = vi.mocked(tenantQuery);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 10n, userId: 'user-1', role: 'operario' });
    service = new ManufacturingModelsService();
  });

  describe('createModel', () => {
    it('creates a model', async () => {
      const dto = { name: 'Prensa Estándar', unit_of_measure: 'piezas/h' as const };
      mockTenantQuery.mockResolvedValue({
        rows: [{ id: 'model-1', name: 'Prensa Estándar', unit_of_measure: 'piezas/h', tenant_id: 10n }],
      } as any);

      const result = await service.createModel(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Prensa Estándar');
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('INSERT INTO manufacturing_models'),
        ['Prensa Estándar', 'piezas/h', null, null]
      );
    });
  });

  describe('listModels', () => {
    it('returns models for current tenant', async () => {
      const models = [
        { id: 'model-1', name: 'Prensa Estándar', unit_of_measure: 'piezas/h' },
        { id: 'model-2', name: 'Corte Rápido', unit_of_measure: 'm/h' },
      ];
      mockTenantQuery.mockResolvedValue({ rows: models } as any);

      const result = await service.listModels();

      expect(result).toEqual(models);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('WHERE tenant_id ='),
      );
    });
  });

  describe('getModel', () => {
    it('returns a model by id', async () => {
      const model = { id: 'model-1', name: 'Prensa Estándar', unit_of_measure: 'piezas/h' };
      mockTenantQuery.mockResolvedValue({ rows: [model] } as any);

      const result = await service.getModel('model-1');

      expect(result).toEqual(model);
    });

    it('returns null when model not found', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.getModel('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateModel', () => {
    it('updates model fields', async () => {
      const dto = { unit_of_measure: 'kg/h' as const };
      const updated = { id: 'model-1', name: 'Prensa Estándar', unit_of_measure: 'kg/h' };
      mockTenantQuery.mockResolvedValue({ rows: [updated] } as any);

      const result = await service.updateModel('model-1', dto);

      expect(result).toEqual(updated);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('UPDATE manufacturing_models'),
        expect.arrayContaining(['kg/h', 'model-1'])
      );
    });

    it('returns null when model not found', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.updateModel('nonexistent', { unit_of_measure: 'L/h' });

      expect(result).toBeNull();
    });
  });

  describe('deleteModel', () => {
    it('deletes a model', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 1 } as any);

      const result = await service.deleteModel('model-1');

      expect(result).toBe(true);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('DELETE FROM manufacturing_models'),
        ['model-1']
      );
    });

    it('returns false when model not found', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 0 } as any);

      const result = await service.deleteModel('nonexistent');

      expect(result).toBe(false);
    });
  });
});
