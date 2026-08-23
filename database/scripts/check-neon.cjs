const { Client } = require('pg');

// La credencial real vive en NEON_DATABASE_URL (nunca en el repo)
function requireEnvNEON() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) { console.error('Define NEON_DATABASE_URL'); process.exit(1); }
  return url;
}

const c = new Client({ connectionString: requireEnvNEON() });

async function main() {
  await c.connect();
  
  // List tables
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('=== TABLAS EN NEON ===');
  console.log(tables.rows.map(r => r.table_name).join('\n'));
  
  // Count rows in each table
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
