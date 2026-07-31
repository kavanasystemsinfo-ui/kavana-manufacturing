import { Injectable } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';

export interface CostEntry {
  id: string;
  order_id: string;
  category: 'material' | 'labor' | 'overhead' | 'energy';
  amount: number;
  currency: string;
  description: string | null;
  created_at: string;
}

export interface CostSummary {
  total_material: number;
  total_labor: number;
  total_overhead: number;
  total_energy: number;
  total_cost: number;
  currency: string;
}

@Injectable()
export class CostService {
  async createEntry(orderId: string, category: 'material' | 'labor' | 'overhead' | 'energy', amount: number, currency: string, description?: string): Promise<CostEntry> {
    const context = getTenantContext();
    const r = await postgresPool.query(
      `INSERT INTO cost_entries (tenant_id, order_id, category, amount, currency, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, order_id, category, amount, currency, description, created_at`,
      [String(context.tenantId), orderId, category, amount, currency, description ?? null],
    );
    return r.rows[0];
  }

  async listEntries(orderId: string): Promise<CostEntry[]> {
    const context = getTenantContext();
    const r = await postgresPool.query(
      `SELECT id, order_id, category, amount, currency, description, created_at
       FROM cost_entries
       WHERE tenant_id = $1 AND order_id = $2
       ORDER BY created_at DESC`,
      [String(context.tenantId), orderId],
    );
    return r.rows;
  }

  async getSummary(orderId: string): Promise<CostSummary> {
    const context = getTenantContext();
    const r = await postgresPool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE category = 'material'), 0)::numeric as total_material,
         COALESCE(SUM(amount) FILTER (WHERE category = 'labor'), 0)::numeric as total_labor,
         COALESCE(SUM(amount) FILTER (WHERE category = 'overhead'), 0)::numeric as total_overhead,
         COALESCE(SUM(amount) FILTER (WHERE category = 'energy'), 0)::numeric as total_energy,
         COALESCE(SUM(amount), 0)::numeric as total_cost,
         COALESCE(MAX(currency), 'USD') as currency
       FROM cost_entries
       WHERE tenant_id = $1 AND order_id = $2`,
      [String(context.tenantId), orderId],
    );
    const row = r.rows[0];
    return {
      total_material: Number(row.total_material),
      total_labor: Number(row.total_labor),
      total_overhead: Number(row.total_overhead),
      total_energy: Number(row.total_energy),
      total_cost: Number(row.total_cost),
      currency: row.currency,
    };
  }
}
