import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const migrationsDir = resolve(projectRoot, 'database', 'migrations');
const testsDir = resolve(projectRoot, 'database', 'tests');

const containerName = `kavana-v3-smoke-${randomUUID()}`;
const postgresImage = process.env.KAVANA_POSTGRES_IMAGE ?? 'postgres:18';
const postgresPort = process.env.KAVANA_POSTGRES_PORT ?? '55432';
const postgresUser = process.env.KAVANA_POSTGRES_USER ?? 'postgres';
const postgresPassword = process.env.KAVANA_POSTGRES_PASSWORD ?? 'postgres';
const postgresDb = process.env.KAVANA_POSTGRES_DB ?? 'kavana_v3_smoke';
const skipDocker = process.env.KAVANA_SKIP_DOCKER === '1';
const applyOnly = process.argv.includes('--apply-only');
const testsOnly = process.argv.includes('--tests-only');
const explicitDatabaseUrl = process.argv.find((arg) => arg.startsWith('--database-url='))?.slice('--database-url='.length);
const databaseUrl = explicitDatabaseUrl ?? process.env.DATABASE_URL;

const migrationFiles = [
  '000_extensions_roles_rls.sql',
  '001_tenants_users.sql',
  '002_workstations.sql',
  '003_production_orders.sql',
  '004_production_time_logs.sql',
  '005_tenant_governance.sql',
  '006_refactor_production_blocks.sql',
  '007_manufacturing_models.sql',
  '008_fix_users_and_seed.sql',
  '009_admin_orders.sql',
  '010_replace_estimated_minutes_with_unit.sql',
  '011_add_target_rate_to_manufacturing_models.sql',
  '012_create_quality_checks.sql',
  '013_create_cost_entries.sql',
  '014_add_subdomain_to_tenants.sql',
  '015_add_workstation_to_manufacturing_models.sql',
  '016_add_user_profile_fields.sql',
  '017_add_custom_fields_to_orders.sql',
  '018_add_production_tracking_to_orders.sql',
  '019_backfill_production_orders.sql',
  '020_create_production_work_blocks.sql',
  '021_prepare_orders_for_unification.sql',
  '022_unify_drop_production_orders.sql'
];

const smokeTestFiles = [
  '001_rls_isolation_smoke.sql',
  '002_tenant_governance_smoke.sql'
];

function parseArgs() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  if (args.length > 0) {
    throw new Error('Usage: npm run database:smoke [--apply-only | --tests-only] [--database-url=postgres://...]');
  }

  if (applyOnly && testsOnly) {
    throw new Error('Use either --apply-only or --tests-only, not both.');
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: options.stdio ?? 'pipe',
      env: { ...process.env, ...(options.env ?? {}) }
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        if (options.stream !== false) {
          process.stdout.write(chunk);
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (options.stream !== false) {
          process.stderr.write(chunk);
        }
      });
    }

    child.on('error', rejectRun);
    child.on('close', (code) => {
      if (code === 0) {
        resolveRun({ stdout, stderr });
      } else {
        rejectRun(new Error(`${command} ${args.join(' ')} failed with exit code ${code}\n${stderr}${stdout}`));
      }
    });
  });
}

async function ensurePgDependency() {
  try {
    await import('pg');
  } catch (error) {
    throw new Error(
      'Missing pg dependency. Run: npm install pg@^8.13.1 @types/pg@^8.11.10 --workspace backend, or install pg at the workspace root.'
    );
  }
}

async function ensureDocker() {
  if (skipDocker) {
    return;
  }

  const result = spawnSync('docker', ['--version'], { cwd: projectRoot, encoding: 'utf8' });
  if (result.error) {
    throw new Error(
      'Docker is required to start an ephemeral PostgreSQL container. Set DATABASE_URL or pass --database-url=postgres://... to run against an existing PostgreSQL instance, or start Docker Desktop.'
    );
  }
  if (result.status !== 0) {
    throw new Error(`Docker is not available: ${result.stderr || result.stdout}`);
  }
}

async function startPostgres() {
  if (skipDocker || databaseUrl) {
    return;
  }

  await runCommand('docker', [
    'run',
    '--name',
    containerName,
    '-e',
    `POSTGRES_USER=${postgresUser}`,
    '-e',
    `POSTGRES_PASSWORD=${postgresPassword}`,
    '-e',
    `POSTGRES_DB=${postgresDb}`,
    '-p',
    `${postgresPort}:5432`,
    '-d',
    postgresImage
  ]);

  const deadline = Date.now() + 60_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const client = new Client({
        host: '127.0.0.1',
        port: Number(postgresPort),
        user: postgresUser,
        password: postgresPassword,
        database: postgresDb
      });
      await client.connect();
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
    }
  }

  throw new Error(`PostgreSQL container did not become ready: ${lastError?.message ?? 'unknown error'}`);
}

async function stopPostgres() {
  if (skipDocker || databaseUrl) {
    return;
  }

  try {
    await runCommand('docker', ['rm', '-f', containerName], { stream: false });
  } catch (error) {
    console.warn(`Warning: failed to remove container ${containerName}: ${error.message}`);
  }
}

async function applySqlFile(client, filePath, label) {
  const sql = readFileSync(filePath, 'utf8');
  try {
    await client.query(sql);
    console.log(`[OK] Applied ${label}`);
  } catch (error) {
    throw new Error(`Failed to apply ${label}: ${error.message}`);
  }
}

async function verifyGrants(client) {
  const requiredTables = [
    'users',
    'workstations',
    'production_orders',
    'production_time_logs',
    'tenant_config_audit'
  ];

  for (const table of requiredTables) {
    const result = await client.query(
      `
      SELECT privilege_type
      FROM information_schema.role_table_grants
      WHERE grantee = 'kavana_app'
        AND table_schema = 'public'
        AND table_name = $1
      `,
      [table]
    );

    const privileges = new Set(result.rows.map((row) => row.privilege_type));
    for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      if (!privileges.has(privilege)) {
        throw new Error(`kavana_app missing ${privilege} grant on ${table}`);
      }
    }
  }

  const sequenceResult = await client.query(
    `
    SELECT object_name
    FROM information_schema.role_usage_grants
    WHERE grantee = 'kavana_app'
      AND object_schema = 'public'
      AND object_type = 'SEQUENCE'
      AND privilege_type = 'USAGE'
    `
  );

  if (sequenceResult.rowCount === 0) {
    console.warn('[WARN] No public sequences found; no explicit kavana_app sequence USAGE grant was required.');
  }

  console.log('[OK] Verified kavana_app grants on multi-tenant tables');
}

function createAdminClientFromDatabaseUrl(connectionString) {
  return new Client({ connectionString });
}

function createAdminClientFromEnv() {
  return new Client({
    host: '127.0.0.1',
    port: Number(postgresPort),
    user: postgresUser,
    password: postgresPassword,
    database: postgresDb
  });
}

async function main() {
  parseArgs();
  await ensurePgDependency();

  if (!databaseUrl) {
    await ensureDocker();
  }

  for (const file of [...migrationFiles, ...smokeTestFiles]) {
    const filePath = resolve(migrationFiles.includes(file) ? migrationsDir : testsDir, file);
    if (!existsSync(filePath)) {
      throw new Error(`Required SQL file not found: ${filePath}`);
    }
  }

  if (!databaseUrl && testsOnly) {
    throw new Error('--tests-only requires DATABASE_URL or --database-url pointing to an already-migrated PostgreSQL database.');
  }

  await startPostgres();

  const adminClient = databaseUrl ? createAdminClientFromDatabaseUrl(databaseUrl) : createAdminClientFromEnv();

  try {
    await adminClient.connect();

    if (!testsOnly) {
      for (const file of migrationFiles) {
        await applySqlFile(
          adminClient,
          resolve(migrationsDir, file),
          `migration ${file}`
        );
      }

      await verifyGrants(adminClient);
    }

    if (!applyOnly) {
      for (const file of smokeTestFiles) {
        await applySqlFile(
          adminClient,
          resolve(testsDir, file),
          `smoke test ${file}`
        );
      }
    }

    console.log('[OK] PostgreSQL smoke validation completed successfully.');
  } finally {
    await adminClient.end().catch(() => undefined);
    await stopPostgres();
  }
}

main().catch(async (error) => {
  console.error(error.message);
  await stopPostgres();
  process.exit(1);
});
