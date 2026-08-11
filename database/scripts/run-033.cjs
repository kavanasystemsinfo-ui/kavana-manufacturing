// Runner de la migración 033 contra el entorno (Neon por defecto).
// Uso: set -a; source manufacturing-prod.env; set +a; node database/scripts/run-033.cjs
const fs = require('fs');
const { getClient } = require('../../scripts/db.cjs');

(async () => {
  const client = getClient();
  await client.connect();
  try {
    const sql = fs.readFileSync('database/migrations/033_create_incidencia_uploads.sql', 'utf8');
    await client.query(sql);
    console.log('Migration 033 executed successfully');
    const res = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'incidencia_uploads' ORDER BY ordinal_position"
    );
    console.log('Columns:', res.rows.map((r) => `${r.column_name}:${r.data_type}`).join(', '));
    const policies = await client.query(
      "SELECT policyname FROM pg_policies WHERE tablename = 'incidencia_uploads'"
    );
    console.log('Policies:', policies.rows.map((r) => r.policyname).join(', '));
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
