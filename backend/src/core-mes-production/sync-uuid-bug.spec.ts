import { describe, it, expect } from 'vitest';
import { syncWorkBlockSchema } from './dto.js';

describe('Sync Work Block — UUID validation bug', () => {
  it('rejects non-UUID id', () => {
    const result = syncWorkBlockSchema.safeParse({
      id: 'offline-1234567890-abc123',
      tenant_id: '1',
      order_id: '2b794955-e69b-4478-a327-96e3c55f2363',
      workstation_id: 'fe499408-d9e6-4e91-bec7-4ccfa79221a5',
      operator_id: 'b0000000-0000-0000-0000-000000000003',
      type: 'produccion',
      start_time: '2026-07-10T10:00:00Z',
      end_time: '2026-07-10T13:00:00Z',
      produced_quantity: 50,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid UUID id', () => {
    const result = syncWorkBlockSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      tenant_id: '1',
      order_id: '2b794955-e69b-4478-a327-96e3c55f2363',
      workstation_id: 'fe499408-d9e6-4e91-bec7-4ccfa79221a5',
      operator_id: 'b0000000-0000-0000-0000-000000000003',
      type: 'produccion',
      start_time: '2026-07-10T10:00:00Z',
      end_time: '2026-07-10T13:00:00Z',
      produced_quantity: 50,
    });
    expect(result.success).toBe(true);
  });
});
