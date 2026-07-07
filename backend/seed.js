import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function seed() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  const client = await pool.connect();
  try {
    console.log('Inserting tenant...');
    await client.query("INSERT INTO tenants (id, name, status) VALUES (1, 'Kavana Test Tenant', 'active') ON CONFLICT DO NOTHING");
    const operatorId = '00000000-0000-0000-0000-000000000021';
    await client.query("INSERT INTO users (tenant_id, id, email, name, role) VALUES (1, $1, 'admin@kavana.local', 'Admin', 'tenant_admin') ON CONFLICT DO NOTHING", [operatorId]);
    
    const wsId = '00000000-0000-0000-0000-000000000011';
    const orderId = '00000000-0000-0000-0000-000000000001';
    await client.query("INSERT INTO workstations (tenant_id, id, code, name) VALUES (1, $1, 'WS-01', 'Estación de Prueba') ON CONFLICT DO NOTHING", [wsId]);
    await client.query(`
      INSERT INTO production_orders (tenant_id, id, code, target_quantity, workstation_id, status)
      VALUES (1, $1, 'PO-TEST-001', 1000, $2, 'pendiente')
      ON CONFLICT DO NOTHING
    `, [orderId, wsId]);
    console.log('Seeded successfully!');
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
