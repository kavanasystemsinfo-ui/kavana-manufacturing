const { Client } = require('pg');

async function check(conn, label) {
  const c = new Client({ connectionString: conn });
  await c.connect();
  
  const tables = ['raw_materials', 'model_raw_materials', 'production_orders', 'production_time_logs'];
  for (const t of tables) {
    try {
      const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position`);
      if (r.rows.length === 0) {
        console.log(`[${label}] ${t}: NO EXISTE`);
      } else {
        console.log(`[${label}] ${t}: ${r.rows.map(x => x.column_name).join(', ')}`);
      }
    } catch (e) {
      console.log(`[${label}] ${t}: error - ${e.message}`);
    }
  }
  await c.end();
}

const LOCAL = 'postgresql://kavana:kavana_v3_password@localhost:5433/kavana_v3';
const NEON = 'postgresql://neondb_owner:npg_dqTRbj8nE2MB@ep-steep-cell-a21rlab1.eu-central-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  await check(LOCAL, 'LOCAL');
  console.log('');
  await check(NEON, 'NEON');
})();
