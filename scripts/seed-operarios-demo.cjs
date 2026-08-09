// Seed de OPERARIOS — Fábrica de Placas Solares DEMO (tenant 1)
// Crea 9 operarios adicionales (10 en total con el 1094) para que el histórico
// de órdenes/work_blocks refleje una plantilla real. Solo el 1094 tiene
// contraseña pública (la que usa el visitante para probar el panel de operario);
// el resto tienen contraseñas aleatorias que nadie conoce.
//
// Uso: PGHOST=... PGPASSWORD=*** node scripts/seed-operarios-demo.cjs
// Idempotente: si ya hay >=10 operarios, no crea más.

const { Client } = require('pg');
const crypto = require('crypto');
const { getClient } = require('./db.cjs');

const c = getClient();

// Contraseña PÚBLICA del visitante (documentada en la landing)
const PASSWORD_VISITANTE = 'kavana';

// Formato del backend: salt:sha256(salt + password)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

// Plantilla: 9 operarios de línea (además del 1094)
const OPERARIOS = [
  ['1101', 'Raúl Campos'],
  ['1102', 'María Ferrer'],
  ['1103', 'Javier Ortega'],
  ['1104', 'Laura Benito'],
  ['1105', 'Sergio Navarro'],
  ['1106', 'Cristina Valls'],
  ['1107', 'Pablo Roca'],
  ['1108', 'Elena Marco'],
  ['1109', 'David Puig'],
];

async function main() {
  await c.connect();
  const TENANT = 1;

  // 0) Workstations de la línea solar (para asignar default_workstation_id a cada
  //    operario). FIX 2026-08-09: sin esta asignación, /api/orders/available filtra
  //    por default_workstation_id y los operarios (NULL) veían el panel vacío.
  const wsRes = await c.query(
    "SELECT id FROM workstations WHERE tenant_id=$1 ORDER BY name",
    [TENANT]
  );
  const workstations = wsRes.rows.map((r) => r.id);
  if (workstations.length === 0) {
    console.error('FATAL: no hay workstations en el tenant demo, no se puede asignar default_workstation_id');
    process.exit(1);
  }

  // 1) Asegurar que el 1094 tiene la contraseña pública (idempotente: si cambia
  //    la variable PASSWORD_VISITANTE, actualiza el hash)
  const r1094 = await c.query(
    "SELECT id FROM users WHERE tenant_id=$1 AND username='1094'",
    [TENANT]
  );
  if (r1094.rows.length === 0) {
    await c.query(
      `INSERT INTO users (tenant_id, username, password_hash, role, is_active, employee_number, first_name, last_name)
       VALUES ($1,'1094',$2,'operario',true,'1094','Operario','Demo')`,
      [TENANT, hashPassword(PASSWORD_VISITANTE)]
    );
    console.log('  • 1094 creado con contraseña pública');
  } else {
    await c.query(
      "UPDATE users SET password_hash=$1, is_active=true WHERE tenant_id=$2 AND username='1094'",
      [hashPassword(PASSWORD_VISITANTE), TENANT]
    );
    console.log('  • 1094 actualizado con contraseña pública');
  }

  // 1b) Asignar default_workstation_id al 1094 (reparto determinista: la primera
  //     workstation de la lista). Sin esto, el visitante ve el panel de órdenes vacío.
  await c.query(
    "UPDATE users SET default_workstation_id=$1 WHERE tenant_id=$2 AND username='1094'",
    [workstations[0], TENANT]
  );

  // 2) Crear los 9 operarios extra si no existen (contraseñas aleatorias)
  const exist = await c.query(
    "SELECT username FROM users WHERE tenant_id=$1 AND username LIKE '1%' AND username != '1094'",
    [TENANT]
  );
  const existentes = new Set(exist.rows.map((r) => r.username));

  let creados = 0;
  for (const [num, nombre] of OPERARIOS) {
    if (existentes.has(num)) continue;
    const [first, ...rest] = nombre.split(' ');
    await c.query(
      `INSERT INTO users (tenant_id, username, password_hash, role, is_active, employee_number, first_name, last_name)
       VALUES ($1,$2,$3,'operario',true,$4,$5,$6)`,
      [TENANT, num, hashPassword(crypto.randomBytes(8).toString('hex')), num, first, rest.join(' ')]
    );
    creados++;
  }
  console.log(`  • ${creados} operarios extra creados`);

  // 2b) Asignar default_workstation_id a TODOS los operarios que no tengan una
  //     (reparto rotativo por la línea solar). FIX 2026-08-09: el panel de
  //     órdenes del operario depende de este campo.
  const sinWs = await c.query(
    "SELECT id, username FROM users WHERE tenant_id=$1 AND role='operario' AND default_workstation_id IS NULL ORDER BY username",
    [TENANT]
  );
  let asignados = 0;
  for (const [i, op] of sinWs.rows.entries()) {
    await c.query("UPDATE users SET default_workstation_id=$1 WHERE id=$2", [workstations[i % workstations.length], op.id]);
    asignados++;
  }
  if (asignados > 0) console.log(`  • default_workstation_id asignado a ${asignados} operarios`);

  const total = await c.query(
    "SELECT count(*) FROM users WHERE tenant_id=$1 AND role='operario'",
    [TENANT]
  );
  console.log(`\n✅ Plantilla completa: ${total.rows[0].count} operarios (solo 1094 con contraseña pública)`);
  await c.end();
}

main().catch((e) => { console.error('FATAL:', e.message.slice(0, 300)); process.exit(1); });
