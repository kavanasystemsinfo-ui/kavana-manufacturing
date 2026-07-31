import { Injectable } from '@nestjs/common';
import { postgresPool } from '../db/postgres.provider.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';

export interface QualityCheck {
  id: string;
  order_id: string;
  workstation_id: string;
  inspector_id: string;
  result: 'pass' | 'fail' | 'conditional';
  defect_count: number;
  defect_type: string | null;
  notes: string | null;
  checked_at: string;
}

export interface QualitySummary {
  total_checks: number;
  passed: number;
  failed: number;
  conditional: number;
  pass_rate: number;
  total_defects: number;
}

@Injectable()
export class QualityService {
  async createCheck(orderId: string, workstationId: string, result: 'pass' | 'fail' | 'conditional', defectCount: number, defectType?: string, notes?: string): Promise<QualityCheck> {
    const context = getTenantContext();
    const r = await postgresPool.query(
      `INSERT INTO quality_checks (tenant_id, order_id, workstation_id, inspector_id, result, defect_count, defect_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, order_id, workstation_id, inspector_id, result, defect_count, defect_type, notes, checked_at`,
      [String(context.tenantId), orderId, workstationId, context.userId, result, defectCount, defectType ?? null, notes ?? null],
    );
    return r.rows[0];
  }

  async listChecks(orderId: string): Promise<QualityCheck[]> {
    const context = getTenantContext();
    const r = await postgresPool.query(
      `SELECT id, order_id, workstation_id, inspector_id, result, defect_count, defect_type, notes, checked_at
       FROM quality_checks
       WHERE tenant_id = $1 AND order_id = $2
       ORDER BY checked_at DESC`,
      [String(context.tenantId), orderId],
    );
    return r.rows;
  }

  async getSummary(orderId: string): Promise<QualitySummary> {
    const context = getTenantContext();
    const r = await postgresPool.query(
      `SELECT
         COUNT(*)::int as total_checks,
         COUNT(*) FILTER (WHERE result = 'pass')::int as passed,
         COUNT(*) FILTER (WHERE result = 'fail')::int as failed,
         COUNT(*) FILTER (WHERE result = 'conditional')::int as conditional,
         COALESCE(SUM(defect_count), 0)::int as total_defects
       FROM quality_checks
       WHERE tenant_id = $1 AND order_id = $2`,
      [String(context.tenantId), orderId],
    );
    const row = r.rows[0];
    return {
      total_checks: row.total_checks,
      passed: row.passed,
      failed: row.failed,
      conditional: row.conditional,
      pass_rate: row.total_checks > 0 ? Math.round((row.passed / row.total_checks) * 10000) / 100 : 0,
      total_defects: row.total_defects,
    };
  }
}
