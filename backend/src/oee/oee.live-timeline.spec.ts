import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OeeService } from './oee.service.js';
import { tenantQuery } from '../db/tenant-query.js';
import * as tenantContext from '../auth/tenant-context.storage.js';

vi.mock('../db/tenant-query.js', () => ({
  tenantQuery: vi.fn(),
}));

vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: vi.fn(),
}));

/**
 * La pestaña "Línea en vivo" dibujaba barras con Math.random(). Ahora lee los
 * partes reales de cada puesto en un turno: este contrato fija qué devuelve el
 * endpoint (partes por puesto, orden del último parte, ISO en las fechas) y que
 * un periodo mal pedido o desmesurado se rechaza.
 */
describe('OeeService.getLiveTimeline', () => {
  let service: OeeService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 100n,
      userId: 'sup-1',
      role: 'supervisor',
    });
    service = new OeeService();
  });

  it('agrupa los partes por puesto, con la orden del último parte y los puestos sin partes vacíos', async () => {
    (tenantQuery as any)
      .mockResolvedValueOnce({
        rows: [
          { id: 'w1', name: 'Extrusora', code: 'EXT-01' },
          { id: 'w2', name: 'Laboratorio', code: 'LAB-01' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            workstation_id: 'w1',
            type: 'produccion',
            start_time: new Date('2026-11-17T05:00:00Z'),
            end_time: new Date('2026-11-17T06:00:00Z'),
            downtime_reason: null,
            produced_quantity: '500',
            order_code: '4580',
            order_quantity: '9000',
            order_produced: '500',
            order_status: 'in_progress',
          },
          {
            workstation_id: 'w1',
            type: 'parada',
            start_time: new Date('2026-11-17T06:00:00Z'),
            end_time: new Date('2026-11-17T06:20:00Z'),
            downtime_reason: 'averia_menor',
            produced_quantity: null,
            order_code: '4581',
            order_quantity: '9500',
            order_produced: '1200',
            order_status: 'in_progress',
          },
        ],
      });

    const resultado = await service.getLiveTimeline('2026-11-17T05:00:00Z', '2026-11-17T13:00:00Z');

    expect(resultado).toHaveLength(2);
    const ext = resultado[0];
    expect(ext.code).toBe('EXT-01');
    expect(ext.blocks).toHaveLength(2);
    expect(ext.blocks[0]).toEqual({
      type: 'produccion',
      start_time: '2026-11-17T05:00:00.000Z',
      end_time: '2026-11-17T06:00:00.000Z',
      downtime_reason: null,
      produced_quantity: 500,
      order_code: '4580',
    });
    expect(ext.blocks[1].produced_quantity).toBe(0);
    // la orden del puesto es la del último parte
    expect(ext.order).toEqual({ code: '4581', quantity: 9500, produced_quantity: 1200, status: 'in_progress' });
    expect(resultado[1].blocks).toEqual([]);
    expect(resultado[1].order).toBeNull();
  });

  it('pide solo partes del tenant que se cruzan con el rango', async () => {
    (tenantQuery as any).mockResolvedValue({ rows: [] });

    await service.getLiveTimeline('2026-11-17T05:00:00Z', '2026-11-17T13:00:00Z');

    const consultaPartes = (tenantQuery as any).mock.calls[1];
    expect(consultaPartes[1]).toContain('wb.tenant_id = $1');
    expect(consultaPartes[1]).toContain('wb.start_time < $3 AND wb.end_time > $2');
    expect(consultaPartes[2]).toEqual(['100', '2026-11-17T05:00:00Z', '2026-11-17T13:00:00Z']);
  });

  it('rechaza un periodo sin fechas, al revés o de más de un día', async () => {
    await expect(service.getLiveTimeline('', '')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getLiveTimeline('2026-11-17T13:00:00Z', '2026-11-17T05:00:00Z')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getLiveTimeline('2026-11-01T00:00:00Z', '2026-11-17T00:00:00Z')).rejects.toBeInstanceOf(BadRequestException);
    expect(tenantQuery).not.toHaveBeenCalled();
  });
});
