const { Client } = require('pg');
// Puerto configurable: si el 5433 está ocupado y arrancas el compose con
// DB_PORT=5434, este script tiene que apuntar al mismo sitio.
const DB_PORT = process.env.DB_PORT || 5433;
const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  console.error('Define DB_PASSWORD (la del docker-compose local; sin credenciales hardcodeadas en el repo).');
  process.exit(1);
}
const c = new Client({ host: 'localhost', port: Number(DB_PORT), user: 'kavana', password: DB_PASSWORD, database: 'kavana_v3' });

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
