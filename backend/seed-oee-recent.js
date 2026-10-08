import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://kavana:kavana_v3_password@db:5432/kavana_v3'
});

const TENANT_ID = 1;
const START_DATE = new Date('2026-10-02T00:00:00Z');

async function main() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const workstationsRes = await client.query(
      'SELECT id FROM workstations WHERE tenant_id = $1 AND status = \'active\'',
      [TENANT_ID]
    );
    const workstations = workstationsRes.rows.map(r => r.id);
    
    console.log(`Workstations: ${workstations.length}`);
    
    let oeeCount = 0;
    
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) { // 2-9 oct
      const periodStart = new Date(START_DATE);
      periodStart.setDate(periodStart.getDate() + dayOffset);
      periodStart.setHours(6, 0, 0, 0);
      
      const periodEnd = new Date(periodStart);
      periodEnd.setHours(22, 0, 0, 0);
      
      for (const wsId of workstations) {
        // OEE realista: 65-95%
        const availability = Math.round((Math.random() * (98 - 75) + 75) * 10) / 10;
        const performance = Math.round((Math.random() * (95 - 70) + 70) * 10) / 10;
        const quality = Math.round((Math.random() * (99.5 - 90) + 90) * 10) / 10;
        const oee = Math.round((availability * performance * quality) / 10000 * 100) / 100;
        
        await client.query(
          `INSERT INTO oee_metrics 
           (tenant_id, workstation_id, period_start, period_end, availability, performance, quality, oee, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING`,
          [TENANT_ID, wsId, periodStart, periodEnd, availability, performance, quality, oee, new Date()]
        );
        oeeCount++;
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ ${oeeCount} métricas OEE creadas`);
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);