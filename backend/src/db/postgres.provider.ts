import { Pool } from 'pg';

// Allow individual PostgreSQL env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
// as an alternative to DATABASE_URL (which has URL-parsing issues with some passwords)
const hasIndividualVars = !!process.env.PGHOST;
const poolConfig = hasIndividualVars
  ? {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER ?? 'postgres',
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE ?? 'postgres',
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PGPOOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    }
  : {
      connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:***@localhost:5432/postgres',
      max: Number(process.env.PGPOOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    };

export const postgresPool = new Pool(poolConfig);
