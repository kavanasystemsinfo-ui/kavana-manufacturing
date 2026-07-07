import pg from 'pg';
import { randomBytes, createHash } from 'node:crypto';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://kavana:kavana_v3_password@localhost:5433/kavana_v3',
});

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

async function main() {
  await client.connect();

  const users = await client.query('SELECT id, username, tenant_id, password_hash FROM users ORDER BY id');
  let fixed = 0;

  for (const u of users.rows) {
    const hasColon = u.password_hash && u.password_hash.includes(':');
    console.log(`User id=${u.id} "${u.username}" tenant=${u.tenant_id}: format=${hasColon ? 'OK' : 'BROKEN'}`);
    if (!hasColon) {
      const newHash = hashPassword('cambiar123');
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, u.id]);
      console.log(`  → Fixed. New password: cambiar123`);
      fixed++;
    }
  }

  console.log(`\n${fixed} user(s) fixed.`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
