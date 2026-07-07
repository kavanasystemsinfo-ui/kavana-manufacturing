import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
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

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = {
      createOrder: vi.fn(),
      listOrders: vi.fn(),
      getOrder: vi.fn(),
      updateOrder: vi.fn(),
      deleteOrder: vi.fn(),
    } as unknown as OrdersService;
    controller = new OrdersController(service);
  });

  describe('createOrder', () => {
    it('creates an order with valid data', async () => {
      const dto = { model_id: '550e8400-e29b-41d4-a716-446655440000', workstation_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 100 };
      const expected = { id: 'order-1', ...dto, status: 'pending', custom_fields: {}, tenant_id: 10n, created_at: new Date() };
      vi.spyOn(service, 'createOrder').mockResolvedValue(expected);

      const result = await controller.createOrder(dto);

      expect(result).toEqual(expected);
      expect(service.createOrder).toHaveBeenCalledWith({ ...dto, custom_fields: {} });
    });

    it('rejects invalid model_id', async () => {
      const dto = { model_id: 'invalid', workstation_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 100 };
      
      await expect(controller.createOrder(dto)).rejects.toThrow();
    });

    it('rejects zero quantity', async () => {
      const dto = { model_id: '550e8400-e29b-41d4-a716-446655440000', workstation_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 0 };
      
      await expect(controller.createOrder(dto)).rejects.toThrow();
    });

    it('rejects negative quantity', async () => {
      const dto = { model_id: '550e8400-e29b-41d4-a716-446655440000', workstation_id: '550e8400-e29b-41d4-a716-446655440001', quantity: -5 };
      
      await expect(controller.createOrder(dto)).rejects.toThrow();
    });
  });

  describe('listOrders', () => {
    it('returns list of orders', async () => {
      const orders = [
        { id: 'order-1', model_id: 'model-1', workstation_id: 'ws-1', quantity: 100, status: 'pending', tenant_id: 10n },
        { id: 'order-2', model_id: 'model-2', workstation_id: 'ws-2', quantity: 50, status: 'in_progress', tenant_id: 10n },
      ];
      vi.spyOn(service, 'listOrders').mockResolvedValue(orders);

      const result = await controller.listOrders();

      expect(result).toEqual(orders);
      expect(service.listOrders).toHaveBeenCalled();
    });

    it('returns empty list when no orders exist', async () => {
      vi.spyOn(service, 'listOrders').mockResolvedValue([]);

      const result = await controller.listOrders();

      expect(result).toEqual([]);
    });
  });

  describe('getOrder', () => {
    it('returns an order by id', async () => {
      const order = { id: 'order-1', model_id: 'model-1', workstation_id: 'ws-1', quantity: 100, status: 'pending', tenant_id: 10n };
      vi.spyOn(service, 'getOrder').mockResolvedValue(order);

      const result = await controller.getOrder('order-1');

      expect(result).toEqual(order);
      expect(service.getOrder).toHaveBeenCalledWith('order-1');
    });

    it('throws NotFoundException when order not found', async () => {
      vi.spyOn(service, 'getOrder').mockResolvedValue(null);

      await expect(controller.getOrder('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrder', () => {
    it('updates an order with valid data', async () => {
      const dto = { status: 'in_progress' as const };
      const updated = { id: 'order-1', model_id: 'model-1', workstation_id: 'ws-1', quantity: 100, status: 'in_progress', tenant_id: 10n };
      vi.spyOn(service, 'updateOrder').mockResolvedValue(updated);

      const result = await controller.updateOrder('order-1', dto);

      expect(result).toEqual(updated);
      expect(service.updateOrder).toHaveBeenCalledWith('order-1', dto);
    });

    it('throws NotFoundException when order not found', async () => {
      vi.spyOn(service, 'updateOrder').mockResolvedValue(null);

      await expect(controller.updateOrder('nonexistent', { status: 'in_progress' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteOrder', () => {
    it('deletes an order', async () => {
      vi.spyOn(service, 'deleteOrder').mockResolvedValue(true);

      const result = await controller.deleteOrder('order-1');
      expect(result).toEqual({ deleted: true });
      expect(service.deleteOrder).toHaveBeenCalledWith('order-1');
    });

    it('throws NotFoundException when order not found', async () => {
      vi.spyOn(service, 'deleteOrder').mockResolvedValue(false);

      await expect(controller.deleteOrder('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('OrdersService', () => {
  let service: OrdersService;
  const mockTenantQuery = vi.mocked(tenantQuery);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({ tenantId: 10n, userId: 'user-1', role: 'operario' });
    service = new OrdersService();
  });

  describe('createOrder', () => {
    it('creates an order', async () => {
      const dto = { model_id: 'model-1', workstation_id: 'ws-1', quantity: 100 };
      mockTenantQuery.mockResolvedValue({
        rows: [{ id: 'order-1', model_id: 'model-1', workstation_id: 'ws-1', quantity: 100, status: 'pending', custom_fields: {}, created_by: 'user-1' }],
      } as any);

      const result = await service.createOrder(dto);

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('INSERT INTO orders'),
        expect.arrayContaining(['model-1', 'ws-1', 100, '{}', 'user-1'])
      );
    });
  });

  describe('listOrders', () => {
    it('returns orders for current tenant', async () => {
      const orders = [
        { id: 'order-1', model_id: 'model-1', workstation_id: 'ws-1', quantity: 100, status: 'pending', produced_quantity: '0', defect_quantity: '0', model_name: 'Modelo A', workstation_name: 'Puesto 1', custom_fields: {} },
        { id: 'order-2', model_id: 'model-2', workstation_id: 'ws-2', quantity: 50, status: 'in_progress', produced_quantity: '10', defect_quantity: '0', model_name: 'Modelo B', workstation_name: 'Puesto 2', custom_fields: {} },
      ];
      mockTenantQuery.mockResolvedValue({ rows: orders } as any);

      const result = await service.listOrders();

      expect(result).toEqual(orders);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('WHERE o.tenant_id'),
      );
    });
  });

  describe('getOrder', () => {
    it('returns an order by id', async () => {
      const order = { id: 'order-1', model_id: 'model-1', workstation_id: 'ws-1', quantity: 100, status: 'pending' };
      mockTenantQuery.mockResolvedValue({ rows: [order] } as any);

      const result = await service.getOrder('order-1');

      expect(result).toEqual(order);
    });

    it('returns null when order not found', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.getOrder('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateOrder', () => {
    it('updates order fields', async () => {
      const dto = { status: 'in_progress' as const };
      const updated = { id: 'order-1', model_id: 'model-1', workstation_id: 'ws-1', quantity: 100, status: 'in_progress' };
      mockTenantQuery.mockResolvedValue({ rows: [updated] } as any);

      const result = await service.updateOrder('order-1', dto);

      expect(result).toEqual(updated);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('UPDATE orders'),
        expect.arrayContaining(['in_progress', 'order-1'])
      );
    });

    it('returns null when order not found', async () => {
      mockTenantQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.updateOrder('nonexistent', { status: 'in_progress' });

      expect(result).toBeNull();
    });
  });

  describe('deleteOrder', () => {
    it('deletes an order', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 1 } as any);

      const result = await service.deleteOrder('order-1');

      expect(result).toBe(true);
      expect(mockTenantQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('DELETE FROM orders'),
        ['order-1']
      );
    });

    it('returns false when order not found', async () => {
      mockTenantQuery.mockResolvedValue({ rowCount: 0 } as any);

      const result = await service.deleteOrder('nonexistent');

      expect(result).toBe(false);
    });
  });
});
