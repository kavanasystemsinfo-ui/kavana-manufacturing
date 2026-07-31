import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiAdvisorService } from './ai-advisor.service.js';
import * as tenantContext from '../auth/tenant-context.storage.js';
import * as tenantQueryModule from '../db/tenant-query.js';

vi.mock('../db/tenant-query.js', () => ({
  tenantQuery: vi.fn(),
}));

vi.mock('../telemetry/metrics.js', () => ({
  tracePrompt: vi.fn(() => ({ ok: vi.fn(), error: vi.fn() })),
}));

describe('AiAdvisorService', () => {
  let service: AiAdvisorService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(tenantContext, 'getTenantContext').mockReturnValue({
      tenantId: 1n,
      userId: 'test-user',
      role: 'admin',
    });
    service = new AiAdvisorService();
  });

  it('returns offline fallback when LLM call fails', async () => {
    // Mock DB queries to return empty results
    (tenantQueryModule.tenantQuery as any).mockResolvedValue({ rows: [] });

    const result = await service.ask('¿cómo va la producción?');

    expect(result.engine).toBe('offline');
    expect(result.answer).toContain('No pude consultar');
    expect(result.contextVersion.hash).toBeDefined();
    expect(result.contextVersion.hash.length).toBe(12);
  });

  it('generates a context version hash', async () => {
    (tenantQueryModule.tenantQuery as any).mockResolvedValue({ rows: [] });

    const result = await service.ask('¿qué órdenes están activas?');

    expect(result.contextVersion.tenantId).toBe('1');
    expect(result.contextVersion.orderCount).toBe(0);
    expect(result.contextVersion.hash).toMatch(/^[a-f0-9]{12}$/);
  });

  it('builds prompt with production context', async () => {
    const mockOrder = {
      id: 'ord-1', code: 'ORD-001', status: 'active',
      quantity: 100, produced_quantity: 45, defect_quantity: 2,
      created_at: '2026-07-01T10:00:00Z', updated_at: '2026-07-01T10:00:00Z',
      model_name: 'Modelo A', workstation_name: 'Línea 1',
    };
    (tenantQueryModule.tenantQuery as any).mockResolvedValue({ rows: [mockOrder] });

    const result = await service.ask('¿cómo va la orden ORD-001?');

    // Should have attempted LLM call (which fails -> offline)
    expect(result.engine).toBe('offline');
    expect(result.contextVersion.orderCount).toBe(1);
  });
});
