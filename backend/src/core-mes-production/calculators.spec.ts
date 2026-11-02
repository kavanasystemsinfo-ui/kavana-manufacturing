import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreMesProductionService } from './core-mes-production.service.js';
import { createCalculatorSchema, listCalculatorsQuerySchema } from './dto.js';
import * as tenantQueryModule from '../db/tenant-query.js';

vi.mock('../db/tenant-query.js', () => ({ tenantQuery: vi.fn() }));
vi.mock('../auth/tenant-context.storage.js', () => ({
  getTenantContext: () => ({ tenantId: 7n, userId: '11111111-1111-4111-8111-111111111111' }),
}));

const WS = '22222222-2222-4222-8222-222222222222';
const tq = tenantQueryModule.tenantQuery as unknown as ReturnType<typeof vi.fn>;

describe('calculadoras de embalaje: validación', () => {
  it('acepta una calculadora completa y recorta el nombre', () => {
    const dto = createCalculatorSchema.parse({ workstation_id: WS, name: '  Palet K-100 ', pieces_per_pack: 5, packs_per_row: 2, rows_per_pallet: 4 });
    expect(dto.name).toBe('Palet K-100');
  });

  it('rechaza nombre vacío, cantidades a cero o decimales y puesto que no es uuid', () => {
    const base = { workstation_id: WS, name: 'A', pieces_per_pack: 5, packs_per_row: 2, rows_per_pallet: 4 };
    expect(() => createCalculatorSchema.parse({ ...base, name: '   ' })).toThrow();
    expect(() => createCalculatorSchema.parse({ ...base, pieces_per_pack: 0 })).toThrow();
    expect(() => createCalculatorSchema.parse({ ...base, packs_per_row: 1.5 })).toThrow();
    expect(() => createCalculatorSchema.parse({ ...base, workstation_id: 'x' })).toThrow();
    expect(() => listCalculatorsQuerySchema.parse({})).toThrow();
  });
});

describe('calculadoras de embalaje: servicio', () => {
  let service: CoreMesProductionService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CoreMesProductionService({} as never);
  });

  it('lista las del puesto filtrando por planta y puesto', async () => {
    tq.mockResolvedValue({ rows: [{ id: 'c1' }] });
    const rows = await service.listCalculators({ workstation_id: WS });
    expect(rows).toEqual([{ id: 'c1' }]);
    expect(tq.mock.calls[0][2]).toEqual(['7', WS]);
  });

  it('al crear, el autor sale del token y no del cuerpo', async () => {
    tq.mockResolvedValue({ rows: [{ id: 'c2', pieces_per_pallet: 40 }] });
    const created = await service.createCalculator({ workstation_id: WS, name: 'Palet', pieces_per_pack: 5, packs_per_row: 2, rows_per_pallet: 4 });
    expect(created.pieces_per_pallet).toBe(40);
    expect(tq.mock.calls[0][2]).toEqual(['7', WS, 'Palet', 5, 2, 4, '11111111-1111-4111-8111-111111111111']);
  });

  it('un nombre repetido en el puesto da un error claro', async () => {
    tq.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
    await expect(
      service.createCalculator({ workstation_id: WS, name: 'Palet', pieces_per_pack: 5, packs_per_row: 2, rows_per_pallet: 4 }),
    ).rejects.toThrow('Ya existe una calculadora con ese nombre');
  });
});
