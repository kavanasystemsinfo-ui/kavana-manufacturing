import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = {
      createUser: vi.fn(),
      listUsers: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    } as unknown as UsersService;
    controller = new UsersController(service);
  });

  describe('createUser', () => {
    it('creates a user with valid data', async () => {
      const dto = { username: 'operator1', password: 'password123', role: 'operario' as const };
      const expectedUser = { id: 'user-1', ...dto, tenant_id: 10n, created_at: new Date() };
      vi.spyOn(service, 'createUser').mockResolvedValue(expectedUser);

      const result = await controller.createUser(dto);

      expect(result).toEqual(expectedUser);
      expect(service.createUser).toHaveBeenCalledWith(dto);
    });

    it('rejects invalid role', async () => {
      const dto = { username: 'operator1', password: 'password123', role: 'invalid_role' as any };
      
      await expect(controller.createUser(dto)).rejects.toThrow();
    });

    it('rejects short username', async () => {
      const dto = { username: 'ab', password: 'password123', role: 'operario' as const };
      
      await expect(controller.createUser(dto)).rejects.toThrow();
    });

    it('rejects short password', async () => {
      const dto = { username: 'operator1', password: '12345', role: 'operario' as const };
      
      await expect(controller.createUser(dto)).rejects.toThrow();
    });
  });

  describe('listUsers', () => {
    it('returns list of users', async () => {
      const users = [
        { id: 'user-1', username: 'admin', role: 'tenant_admin', tenant_id: 10n },
        { id: 'user-2', username: 'operator1', role: 'operario', tenant_id: 10n },
      ];
      vi.spyOn(service, 'listUsers').mockResolvedValue(users);

      const result = await controller.listUsers();

      expect(result).toEqual(users);
      expect(service.listUsers).toHaveBeenCalled();
    });

    it('returns empty list when no users exist', async () => {
      vi.spyOn(service, 'listUsers').mockResolvedValue([]);

      const result = await controller.listUsers();

      expect(result).toEqual([]);
    });
  });

  describe('getUser', () => {
    it('returns a user by id', async () => {
      const user = { id: 'user-1', username: 'admin', role: 'tenant_admin', tenant_id: 10n };
      vi.spyOn(service, 'getUser').mockResolvedValue(user);

      const result = await controller.getUser('user-1');

      expect(result).toEqual(user);
      expect(service.getUser).toHaveBeenCalledWith('user-1');
    });

    it('throws NotFoundException when user not found', async () => {
      vi.spyOn(service, 'getUser').mockResolvedValue(null);

      await expect(controller.getUser('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('updates a user with valid data', async () => {
      const dto = { role: 'supervisor' as const };
      const updatedUser = { id: 'user-1', username: 'admin', role: 'supervisor', tenant_id: 10n };
      vi.spyOn(service, 'updateUser').mockResolvedValue(updatedUser);

      const result = await controller.updateUser('user-1', dto);

      expect(result).toEqual(updatedUser);
      expect(service.updateUser).toHaveBeenCalledWith('user-1', dto);
    });

    it('throws NotFoundException when user not found', async () => {
      vi.spyOn(service, 'updateUser').mockResolvedValue(null);

      await expect(controller.updateUser('nonexistent', { role: 'supervisor' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('deletes a user', async () => {
      vi.spyOn(service, 'deleteUser').mockResolvedValue(true);

      const result = await controller.deleteUser('user-1');
      expect(result).toEqual({ deleted: true });
      expect(service.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('throws NotFoundException when user not found', async () => {
      vi.spyOn(service, 'deleteUser').mockResolvedValue(false);

      await expect(controller.deleteUser('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('UsersService', () => {
  let service: UsersService;
  const mockTenantQuery = vi.mocked(tenantQuery);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 10n, userId: 'user-1', role: 'operario' });
    service = new UsersService();
  });

  describe('createUser', () => {
    it('creates a user with hashed password', async () => {
      const dto = { username: 'operator1', password: 'password123', role: 'operario' as const };
      mockTenantQuery.mockResolvedValue({
        rows: [{ id: 'user-1', username: 'operator1', role: 'operario', tenant_id: 10n }],
      } as any);

      const result = await service.createUser(dto);

      expect(result).toBeDefined();
      expect(result.username).toBe('operator1');
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['operator1', expect.stringContaining(':'), 'operario'])
      );
    });

    it('rejects duplicate username for same tenant', async () => {
      const dto = { username: 'operator1', password: 'password123', role: 'operario' as const };
      mockTenantQuery.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

      await expect(service.createUser(dto)).rejects.toThrow();
    });
  });

  describe('listUsers', () => {
    it('returns users for current tenant', async () => {
      const users = [
        { id: 'user-1', username: 'admin', role: 'tenant_admin' },
        { id: 'user-2', username: 'operator1', role: 'operario' },
      ];
      mockTenantQuery.mockResolvedValue({ rows: users } as any);

      const result = await service.listUsers();

      expect(result).toEqual(users);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('WHERE tenant_id ='),
      );
    });
  });

  describe('getUser', () => {
    it('returns a user by id', async () => {
      const user = { id: 'user-1', username: 'admin', role: 'tenant_admin' };
      mockTenantQuery.mockResolvedValue({ rows: [user] } as any);

      const result = await service.getUser('user-1');

      expect(result).toEqual(user);
    });

    it('returns null when user not found', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.getUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('updates user fields', async () => {
      const dto = { role: 'supervisor' as const };
      const updatedUser = { id: 'user-1', username: 'admin', role: 'supervisor' };
      mockTenantQuery.mockResolvedValue({ rows: [updatedUser] } as any);

      const result = await service.updateUser('user-1', dto);

      expect(result).toEqual(updatedUser);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['supervisor', 'user-1'])
      );
    });

    it('returns null when user not found', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.updateUser('nonexistent', { role: 'supervisor' });

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('deletes a user', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 1 } as any);

      const result = await service.deleteUser('user-1');

      expect(result).toBe(true);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('DELETE FROM users'),
        ['user-1']
      );
    });

    it('returns false when user not found', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 0 } as any);

      const result = await service.deleteUser('nonexistent');

      expect(result).toBe(false);
    });
  });
});
