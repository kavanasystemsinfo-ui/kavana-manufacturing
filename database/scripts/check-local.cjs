const { Client } = require('pg');
// Puerto configurable: si el 5433 está ocupado y arrancas el compose con
// DB_PORT=5434, este script tiene que apuntar al mismo sitio.
const DB_PORT = process.env.DB_PORT || 5433;
const c = new Client({ connectionString: `postgresql://kavana:kavana_v3_password@localhost:${DB_PORT}/kavana_v3` });

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
