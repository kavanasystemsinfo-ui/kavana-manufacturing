import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreMesProductionController } from './core-mes-production.controller.js';
import { CoreMesProductionService } from './core-mes-production.service.js';
import { createProductionOrderSchema, syncWorkBlockSchema } from './dto.js';

describe('CoreMesProductionController', () => {
  let controller: CoreMesProductionController;
  let serviceMock: Record<keyof CoreMesProductionService, any>;

  beforeEach(() => {
    serviceMock = {
      listOrders: vi.fn(),
      createOrder: vi.fn(),
      getOrder: vi.fn(),
      transitionOrder: vi.fn(),
      syncWorkBlock: vi.fn(),
      listOrderLogs: vi.fn(),
      lockOrder: vi.fn(),
      insertWorkBlock: vi.fn(),
    };

    controller = new CoreMesProductionController(
      serviceMock as unknown as CoreMesProductionService,
    );
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder', () => {
    it('debería fallar si el payload no cumple el esquema Zod (DTO)', () => {
      const invalidPayload = { product_id: 123 };

      expect(() => controller.createOrder(invalidPayload)).toThrow();
    });

    it('debería llamar al servicio si el payload es válido', () => {
      const validPayload = {
        code: 'ORD-001',
        target_quantity: 100,
        custom_fields: {},
      };
      serviceMock.createOrder.mockReturnValue('created-order');

      const result = controller.createOrder(validPayload);
      const expectedDto = createProductionOrderSchema.parse(validPayload);

      expect(serviceMock.createOrder).toHaveBeenCalledWith(expectedDto);
      expect(result).toBe('created-order');
    });
  });

  describe('syncWorkBlock', () => {
    it('debería rechazar payloads incompletos de sincronización offline', () => {
      const invalidPayload = {
        order_id: 'ord-1',
      };

      expect(() => controller.syncWorkBlock(invalidPayload)).toThrow();
    });

    it('debería pasar si el payload offline es válido', () => {
      const validPayload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '1',
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        workstation_id: '123e4567-e89b-12d3-a456-426614174000',
        operator_id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'produccion',
        start_time: '2026-06-14T08:00:00Z',
        end_time: '2026-06-14T10:00:00Z',
        produced_quantity: 100,
        is_offline_event: true,
        client_device_id: 'tablet-1',
      };
      serviceMock.syncWorkBlock.mockReturnValue('synced');

      const result = controller.syncWorkBlock(validPayload);
      const expectedDto = syncWorkBlockSchema.parse(validPayload);

      expect(serviceMock.syncWorkBlock).toHaveBeenCalledWith(expectedDto);
      expect(result).toBe('synced');
    });

    it('debería rechazar un bloque de parada si no incluye downtime_reason', () => {
      const invalidPayload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '1',
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        workstation_id: '123e4567-e89b-12d3-a456-426614174000',
        operator_id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'parada',
        start_time: '2026-06-14T08:00:00Z',
        end_time: '2026-06-14T10:00:00Z',
        is_offline_event: true,
        client_device_id: 'tablet-1',
      };

      expect(() => controller.syncWorkBlock(invalidPayload)).toThrow();
    });
  });
});
