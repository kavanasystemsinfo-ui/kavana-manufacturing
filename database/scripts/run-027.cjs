const { Client } = require('pg');
const fs = require('fs');
// Puerto configurable: debe coincidir con DB_PORT del docker-compose.
const DB_PORT = process.env.DB_PORT || 5433;
const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  console.error('Define DB_PASSWORD (la del docker-compose local; sin credenciales hardcodeadas en el repo).');
  process.exit(1);
}
const client = new Client({ host: 'localhost', port: Number(DB_PORT), user: 'kavana', password: DB_PASSWORD, database: 'kavana_v3' });
(async () => {
  await client.connect();
  const sql = fs.readFileSync('database/migrations/027_create_incidencias.sql', 'utf8');
  await client.query(sql);
  console.log('Migration 027 executed successfully');
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'incidencias' ORDER BY ordinal_position");
  console.log('Columns:', res.rows.map(r => r.column_name + ':' + r.data_type).join(', '));
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
