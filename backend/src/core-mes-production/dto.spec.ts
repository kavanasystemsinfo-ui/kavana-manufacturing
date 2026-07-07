import { describe, expect, it } from 'vitest';
import { syncWorkBlockSchema } from './dto.js';

describe('offline work block DTO (retrospective)', () => {
  it('parses a valid production block', () => {
    const dto = syncWorkBlockSchema.parse({
      id: '00000000-0000-0000-0000-000000000101',
      tenant_id: '10',
      order_id: '00000000-0000-0000-0000-000000000001',
      workstation_id: '00000000-0000-0000-0000-000000000011',
      operator_id: '00000000-0000-0000-0000-000000000021',
      type: 'produccion',
      start_time: '2026-06-14T08:00:00.000Z',
      end_time: '2026-06-14T10:00:00.000Z',
      produced_quantity: 150,
      defect_quantity: 2,
      client_device_id: 'HMI-PLANT-01',
    });

    expect(dto.tenant_id).toBe(10n);
    expect(dto.type).toBe('produccion');
    expect(dto.produced_quantity).toBe(150);
  });

  it('rejects production blocks without produced_quantity', () => {
    const result = syncWorkBlockSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000101',
      tenant_id: '10',
      order_id: '00000000-0000-0000-0000-000000000001',
      workstation_id: '00000000-0000-0000-0000-000000000011',
      operator_id: '00000000-0000-0000-0000-000000000021',
      type: 'produccion',
      start_time: '2026-06-14T08:00:00.000Z',
      end_time: '2026-06-14T10:00:00.000Z',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['produced_quantity']);
  });

  it('rejects downtime blocks without downtime_reason', () => {
    const result = syncWorkBlockSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000101',
      tenant_id: '10',
      order_id: '00000000-0000-0000-0000-000000000001',
      workstation_id: '00000000-0000-0000-0000-000000000011',
      operator_id: '00000000-0000-0000-0000-000000000021',
      type: 'parada',
      start_time: '2026-06-14T10:00:00.000Z',
      end_time: '2026-06-14T10:30:00.000Z',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['downtime_reason']);
  });

  it('rejects blocks where end_time is before or equal to start_time', () => {
    const result = syncWorkBlockSchema.safeParse({
      id: '00000000-0000-0000-0000-000000000101',
      tenant_id: '10',
      order_id: '00000000-0000-0000-0000-000000000001',
      workstation_id: '00000000-0000-0000-0000-000000000011',
      operator_id: '00000000-0000-0000-0000-000000000021',
      type: 'produccion',
      start_time: '2026-06-14T11:00:00.000Z',
      end_time: '2026-06-14T10:00:00.000Z', // Invertido
      produced_quantity: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['end_time']);
  });
});
