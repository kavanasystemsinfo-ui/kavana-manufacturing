import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WorkstationsController } from './workstations.controller.js';
import { WorkstationsService } from './workstations.service.js';
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

describe('WorkstationsController', () => {
  let controller: WorkstationsController;
  let service: WorkstationsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = {
      createWorkstation: vi.fn(),
      listWorkstations: vi.fn(),
      getWorkstation: vi.fn(),
      updateWorkstation: vi.fn(),
      deleteWorkstation: vi.fn(),
    } as unknown as WorkstationsService;
    controller = new WorkstationsController(service);
  });

  describe('createWorkstation', () => {
    it('creates a workstation with valid data', async () => {
      const dto = { name: 'Prensa 1', status: 'active' as const };
      const expected = { id: 'ws-1', ...dto, tenant_id: 10n, created_at: new Date() };
      vi.spyOn(service, 'createWorkstation').mockResolvedValue(expected);

      const result = await controller.createWorkstation(dto);

      expect(result).toEqual(expected);
      expect(service.createWorkstation).toHaveBeenCalledWith(dto);
    });

    it('creates a workstation with default status', async () => {
      const dto = { name: 'Prensa 2' };
      const expected = { id: 'ws-2', name: 'Prensa 2', status: 'active', tenant_id: 10n };
      vi.spyOn(service, 'createWorkstation').mockResolvedValue(expected);

      const result = await controller.createWorkstation(dto);

      expect(result.status).toBe('active');
    });

    it('rejects empty name', async () => {
      const dto = { name: '' };
      
      await expect(controller.createWorkstation(dto)).rejects.toThrow();
    });
  });

  describe('listWorkstations', () => {
    it('returns list of workstations', async () => {
      const workstations = [
        { id: 'ws-1', name: 'Prensa 1', status: 'active', tenant_id: 10n },
        { id: 'ws-2', name: 'Prensa 2', status: 'inactive', tenant_id: 10n },
      ];
      vi.spyOn(service, 'listWorkstations').mockResolvedValue(workstations);

      const result = await controller.listWorkstations();

      expect(result).toEqual(workstations);
      expect(service.listWorkstations).toHaveBeenCalled();
    });

    it('returns empty list when no workstations exist', async () => {
      vi.spyOn(service, 'listWorkstations').mockResolvedValue([]);

      const result = await controller.listWorkstations();

      expect(result).toEqual([]);
    });
  });

  describe('getWorkstation', () => {
    it('returns a workstation by id', async () => {
      const workstation = { id: 'ws-1', name: 'Prensa 1', status: 'active', tenant_id: 10n };
      vi.spyOn(service, 'getWorkstation').mockResolvedValue(workstation);

      const result = await controller.getWorkstation('ws-1');

      expect(result).toEqual(workstation);
      expect(service.getWorkstation).toHaveBeenCalledWith('ws-1');
    });

    it('throws NotFoundException when workstation not found', async () => {
      vi.spyOn(service, 'getWorkstation').mockResolvedValue(null);

      await expect(controller.getWorkstation('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateWorkstation', () => {
    it('updates a workstation with valid data', async () => {
      const dto = { status: 'inactive' as const };
      const updated = { id: 'ws-1', name: 'Prensa 1', status: 'inactive', tenant_id: 10n };
      vi.spyOn(service, 'updateWorkstation').mockResolvedValue(updated);

      const result = await controller.updateWorkstation('ws-1', dto);

      expect(result).toEqual(updated);
      expect(service.updateWorkstation).toHaveBeenCalledWith('ws-1', dto);
    });

    it('throws NotFoundException when workstation not found', async () => {
      vi.spyOn(service, 'updateWorkstation').mockResolvedValue(null);

      await expect(controller.updateWorkstation('nonexistent', { status: 'inactive' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteWorkstation', () => {
    it('deletes a workstation', async () => {
      vi.spyOn(service, 'deleteWorkstation').mockResolvedValue(true);

      const result = await controller.deleteWorkstation('ws-1');
      expect(result).toEqual({ deleted: true });
      expect(service.deleteWorkstation).toHaveBeenCalledWith('ws-1');
    });

    it('throws NotFoundException when workstation not found', async () => {
      vi.spyOn(service, 'deleteWorkstation').mockResolvedValue(false);

      await expect(controller.deleteWorkstation('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('WorkstationsService', () => {
  let service: WorkstationsService;
  const mockTenantQuery = vi.mocked(tenantQuery);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 10n, userId: 'user-1', role: 'operario' });
    service = new WorkstationsService();
  });

  describe('createWorkstation', () => {
    it('creates a workstation', async () => {
      const dto = { name: 'Prensa 1', status: 'active' as const };
      mockTenantQuery.mockResolvedValue({
        rows: [{ id: 'ws-1', code: 'prensa-1', name: 'Prensa 1', status: 'active', tenant_id: 10n }],
      } as any);

      const result = await service.createWorkstation(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Prensa 1');
      expect(result.code).toBe('prensa-1');
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('INSERT INTO workstations'),
        ['prensa-1', 'Prensa 1', 'active']
      );
    });
  });

  describe('listWorkstations', () => {
    it('returns workstations for current tenant', async () => {
      const workstations = [
        { id: 'ws-1', name: 'Prensa 1', status: 'active' },
        { id: 'ws-2', name: 'Prensa 2', status: 'inactive' },
      ];
      mockTenantQuery.mockResolvedValue({ rows: workstations } as any);

      const result = await service.listWorkstations();

      expect(result).toEqual(workstations);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('WHERE tenant_id ='),
      );
    });
  });

  describe('getWorkstation', () => {
    it('returns a workstation by id', async () => {
      const workstation = { id: 'ws-1', name: 'Prensa 1', status: 'active' };
      mockTenantQuery.mockResolvedValue({ rows: [workstation] } as any);

      const result = await service.getWorkstation('ws-1');

      expect(result).toEqual(workstation);
    });

    it('returns null when workstation not found', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.getWorkstation('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateWorkstation', () => {
    it('updates workstation fields', async () => {
      const dto = { status: 'inactive' as const };
      const updated = { id: 'ws-1', name: 'Prensa 1', status: 'inactive' };
      mockTenantQuery.mockResolvedValue({ rows: [updated] } as any);

      const result = await service.updateWorkstation('ws-1', dto);

      expect(result).toEqual(updated);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('UPDATE workstations'),
        expect.arrayContaining(['inactive', 'ws-1'])
      );
    });

    it('returns null when workstation not found', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.updateWorkstation('nonexistent', { status: 'inactive' });

      expect(result).toBeNull();
    });
  });

  describe('deleteWorkstation', () => {
    it('deletes a workstation', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 1 } as any);

      const result = await service.deleteWorkstation('ws-1');

      expect(result).toBe(true);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('DELETE FROM workstations'),
        ['ws-1']
      );
    });

    it('returns false when workstation not found', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 0 } as any);

      const result = await service.deleteWorkstation('nonexistent');

      expect(result).toBe(false);
    });
  });
});
