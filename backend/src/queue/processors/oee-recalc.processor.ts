import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { postgresPool } from '../../db/postgres.provider.js';
import { calcularOee, type BloqueDeTrabajo } from '../../oee/oee.calculo.js';

interface OeeRecalcJob {
  tenantId: string;
  workstationId?: string;
  periodDays?: number;
}

interface ParteRow {
  workstation_id: string;
  dia: string;
  type: string;
  start_time: string;
  end_time: string;
  produced_quantity: string | null;
  defect_quantity: string | null;
}

interface ObjetivoRow {
  workstation_id: string;
  dia: string;
  target_rate: string | number | null;
  ms_produccion: string;
}

/**
 * Recálculo del histórico de OEE.
 *
 * Aquí estaba la peor parte del indicador: esta consulta escribía un
 * rendimiento fijo de 0,85 mientras el panel lo calculaba en vivo, así que el
 * histórico y la pantalla podían decir cosas distintas del mismo puesto. Ahora
 * el cálculo sale de la MISMA función que usa el panel (`calcularOee`), con el
 * objetivo ligado al modelo de la orden que produjo, igual que allí.
 *
 * Todo el trabajo va dentro de una transacción: el contexto de cliente se fija
 * con `set_config(..., true)`, que es de ámbito local a la transacción. Sin
 * ella, el contexto moría en la sentencia siguiente y el día que se cierre el
 * aislamiento en la base este job devolvería cero filas sin dar error.
 */
@Processor('oee-recalc')
export class OeeRecalcProcessor extends WorkerHost {
  private readonly logger = new Logger(OeeRecalcProcessor.name);

  async process(job: Job<OeeRecalcJob>): Promise<{ rows: number }> {
    const { tenantId, workstationId } = job.data;
    const days = job.data.periodDays || 7;

    this.logger.log(
      `Recalculando OEE: tenant=${tenantId}, ws=${workstationId || 'all'}, period=${days}d`,
    );

    const client = await postgresPool.connect();

    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);

      const borrados = await client.query(
        `DELETE FROM oee_metrics
         WHERE tenant_id = $1
           AND period_start >= NOW() - ($2 || ' days')::INTERVAL
         RETURNING id`,
        [tenantId, String(days)],
      );

      const partes = await client.query<ParteRow>(
        `SELECT workstation_id,
                to_char(date_trunc('day', start_time), 'YYYY-MM-DD') AS dia,
                type, start_time, end_time, produced_quantity, defect_quantity
         FROM production_work_blocks
         WHERE tenant_id = $1
           AND start_time >= NOW() - ($2 || ' days')::INTERVAL
           AND ($3::uuid IS NULL OR workstation_id = $3::uuid)
         ORDER BY start_time`,
        [tenantId, String(days), workstationId ?? null],
      );

      // Objetivo por puesto y día, ligado por identificador: el mismo criterio
      // que usa el panel, corregido (antes se comparaba código con nombre).
      const objetivos = await client.query<ObjetivoRow>(
        `SELECT wb.workstation_id,
                to_char(date_trunc('day', wb.start_time), 'YYYY-MM-DD') AS dia,
                mm.target_rate,
                SUM(EXTRACT(EPOCH FROM (wb.end_time - wb.start_time))) AS ms_produccion
         FROM manufacturing_models mm
         JOIN orders o ON o.tenant_id = mm.tenant_id AND o.model_id = mm.id
         JOIN production_work_blocks wb ON wb.tenant_id = o.tenant_id AND wb.order_id = o.id
         WHERE wb.tenant_id = $1
           AND wb.type = 'produccion'
           AND wb.start_time >= NOW() - ($2 || ' days')::INTERVAL
           AND ($3::uuid IS NULL OR wb.workstation_id = $3::uuid)
         GROUP BY wb.workstation_id, date_trunc('day', wb.start_time), mm.target_rate
         ORDER BY ms_produccion DESC`,
        [tenantId, String(days), workstationId ?? null],
      );

      const grupos = new Map<string, BloqueDeTrabajo[]>();
      for (const parte of partes.rows) {
        const clave = `${parte.workstation_id}|${parte.dia}`;
        const lista = grupos.get(clave) ?? [];
        lista.push(parte);
        grupos.set(clave, lista);
      }

      // Si un día se trabajaron varios modelos en el mismo puesto, manda el que
      // más tiempo de producción acumuló.
      const tasaPorGrupo = new Map<string, number>();
      for (const objetivo of objetivos.rows) {
        const clave = `${objetivo.workstation_id}|${objetivo.dia}`;
        if (!tasaPorGrupo.has(clave)) {
          tasaPorGrupo.set(clave, Number(objetivo.target_rate ?? 0));
        }
      }

      let insertadas = 0;
      for (const [clave, bloques] of grupos) {
        const [puesto, dia] = clave.split('|');
        const calculado = calcularOee({ bloques, targetRate: tasaPorGrupo.get(clave) ?? 0 });

        await client.query(
          `INSERT INTO oee_metrics (tenant_id, workstation_id, period_start, period_end,
                                    availability, performance, quality, oee)
           VALUES ($1, $2, $3::date, $3::date + INTERVAL '1 day', $4, $5, $6, $7)`,
          [
            tenantId,
            puesto,
            dia,
            calculado.availability,
            calculado.performance,
            calculado.quality,
            calculado.oee,
          ],
        );
        insertadas += 1;
      }

      await client.query('COMMIT');

      this.logger.log(
        `OEE recalc done: deleted=${borrados.rowCount || 0}, inserted=${insertadas}, tenant=${tenantId}`,
      );
      return { rows: insertadas };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`OEE recalc completed: job ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`OEE recalc failed: job ${job.id} — ${err.message}`);
  }
}
