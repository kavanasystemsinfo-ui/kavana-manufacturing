const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: 'postgresql://kavana:kavana_v3_password@localhost:5433/kavana_v3' });
(async () => {
  await client.connect();
  const sql = fs.readFileSync('database/migrations/027_create_incidencias.sql', 'utf8');
  await client.query(sql);
  console.log('Migration 027 executed successfully');
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'incidencias' ORDER BY ordinal_position");
  console.log('Columns:', res.rows.map(r => r.column_name + ':' + r.data_type).join(', '));
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
