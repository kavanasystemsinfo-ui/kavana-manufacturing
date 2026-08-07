// Conexión compartida a Neon (PostgreSQL) para los seeds y scripts de simulación
// de KAVANA Manufacturing. Todas las credenciales vienen de env vars.
// Uso: const { getClient } = require('./db.cjs'); const c = getClient();
const { Client } = require('pg');

function getClient() {
  return new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'neondb_owner',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'neondb',
    ssl: String(process.env.PGSSLMODE || 'require').toLowerCase() !== 'disable'
      ? { rejectUnauthorized: false } : false,
  });
}

module.exports = { getClient };
