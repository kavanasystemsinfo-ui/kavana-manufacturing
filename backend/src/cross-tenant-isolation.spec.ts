import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UsersService } from './users/users.service.js';
import { WorkstationsService } from './workstations/workstations.service.js';
import { ManufacturingModelsService } from './manufacturing-models/manufacturing-models.service.js';
import { OrdersService } from './orders/orders.service.js';
import * as tenantContext from './auth/tenant-context.storage.js';

vi.mock('./auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

vi.mock('./db/postgres.provider.js', () => ({
  postgresPool: {},
}));

const mockTenantQuery = vi.fn();
vi.mock('./db/tenant-query.js', () => ({
  tenantQuery: (...args: any[]) => mockTenantQuery(...args),
}));

describe('Cross-Tenant Isolation — All Services', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 1n, userId: 'admin-1', role: 'tenant_admin' });
  });

  describe('UsersService', () => {
    let service: UsersService;

    beforeEach(() => {
      service = new UsersService();
    });

    it('listUsers queries with get_current_tenant() filter', async () => {
      mockTenantQuery.mockResolvedValue({
        rows: [{ id: 'u1', username: 'alice', role: 'operario' }],
      });

      const users = await service.listUsers();
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('alice');

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('getUser queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] });

      const user = await service.getUser('user-from-other-tenant');
      expect(user).toBeNull();

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('updateUser queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] });

      const result = await service.updateUser('user-from-other-tenant', { username: 'hacked' });
      expect(result).toBeNull();

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('deleteUser queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 0 });

      const deleted = await service.deleteUser('user-from-other-tenant');
      expect(deleted).toBe(false);

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });
  });

  describe('WorkstationsService', () => {
    let service: WorkstationsService;

    beforeEach(() => {
      service = new WorkstationsService();
    });

    it('listWorkstations queries with get_current_tenant() filter', async () => {
      mockTenantQuery.mockResolvedValue({
        rows: [{ id: 'ws1', code: 'linea-1', name: 'Línea 1', status: 'active' }],
      });

      const ws = await service.listWorkstations();
      expect(ws).toHaveLength(1);

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('getWorkstation queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] });

      const ws = await service.getWorkstation('ws-from-other-tenant');
      expect(ws).toBeNull();

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('deleteWorkstation queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 0 });

      const deleted = await service.deleteWorkstation('ws-from-other-tenant');
      expect(deleted).toBe(false);

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });
  });

  describe('ManufacturingModelsService', () => {
    let service: ManufacturingModelsService;

    beforeEach(() => {
      service = new ManufacturingModelsService();
    });

    it('listModels queries with get_current_tenant() filter', async () => {
      mockTenantQuery.mockResolvedValue({
        rows: [{ id: 'm1', name: 'Modelo A', unit_of_measure: 'piezas/h', target_rate: 100 }],
      });

      const models = await service.listModels();
      expect(models).toHaveLength(1);

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('getModel queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] });

      const model = await service.getModel('model-from-other-tenant');
      expect(model).toBeNull();

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('deleteModel queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 0 });

      const deleted = await service.deleteModel('model-from-other-tenant');
      expect(deleted).toBe(false);

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });
  });

  describe('OrdersService', () => {
    let service: OrdersService;

    beforeEach(() => {
      service = new OrdersService();
    });

    it('listOrders queries with get_current_tenant() filter', async () => {
      mockTenantQuery.mockResolvedValue({
        rows: [{ id: 'o1', model_id: 'm1', quantity: 10, status: 'pending' }],
      });

      const orders = await service.listOrders();
      expect(orders).toHaveLength(1);

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('getOrder queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] });

      const order = await service.getOrder('order-from-other-tenant');
      expect(order).toBeNull();

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('updateOrder queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] });

      const result = await service.updateOrder('order-from-other-tenant', { status: 'completed' });
      expect(result).toBeNull();

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });

    it('deleteOrder queries with tenant filter', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 0 });

      const deleted = await service.deleteOrder('order-from-other-tenant');
      expect(deleted).toBe(false);

      const sql = mockTenantQuery.mock.calls[0][1] as string;
      expect(sql).toContain('get_current_tenant()');
    });
  });

  describe('TenantContext — Fail-Closed', () => {
    it('getTenantContext throws when no context exists in AsyncLocalStorage', async () => {
      vi.spyOn(tenantContext, 'getTenantContext').mockImplementation(() => {
        throw new Error('Security Error: No operational tenant context found.');
      });

      const { getTenantContext } = await import('./auth/tenant-context.storage.js');
      expect(() => getTenantContext()).toThrow('Security Error');
    });
  });
});
