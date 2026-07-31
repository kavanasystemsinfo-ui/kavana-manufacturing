const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://kavana:kavana_v3_password@localhost:5433/kavana_v3' });

async function main() {
  await c.connect();
  
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('=== TABLAS EN LOCAL ===');
  console.log(tables.rows.map(r => r.table_name).join('\n'));
  
  console.log('\n=== FILAS POR TABLA ===');
  for (const row of tables.rows) {
    try {
      const count = await c.query(`SELECT COUNT(*) as n FROM ${row.table_name}`);
      console.log(`${row.table_name}: ${count.rows[0].n} filas`);
    } catch (e) {
      console.log(`${row.table_name}: error al contar`);
    }
  }
  
  await c.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
