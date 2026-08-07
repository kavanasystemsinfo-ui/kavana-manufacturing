// Seed de INCIDENCIAS — Fábrica de Placas Solares DEMO (tenant 1)
// Genera 18 incidencias históricas variadas (calidad, mantenimiento, seguridad,
// producción) repartidas en los últimos 90 días con estados realistas
// (resuelto/cerrado para las antiguas, abierto/en_progreso para las recientes).
//
// Uso: PGHOST=... PGPASSWORD=*** node scripts/seed-incidencias-demo.cjs
// Idempotente: borra las que genera este script (reported_by='system') y
// regenera. Las incidencias del seed original (reported_by manual) se respetan.

const { Client } = require('pg');
const crypto = require('crypto');

const c = new Client({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'neondb_owner',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'neondb',
  ssl: String(process.env.PGSSLMODE || 'require').toLowerCase() !== 'disable'
    ? { rejectUnauthorized: false } : false,
});

function uuid() { return crypto.randomUUID(); }

// Semilla determinista (misma ejecución = mismas incidencias)
let seedRnd = 7;
function rnd() {
  seedRnd = (seedRnd * 1103515245 + 12345) % 2147483648;
  return seedRnd / 2147483648;
}
function entre(min, max) { return Math.round(min + rnd() * (max - min)); }
function elegir(arr) { return arr[Math.floor(rnd() * arr.length)]; }

const TIPOS = ['calidad', 'mantenimiento', 'seguridad', 'produccion'];
const SEVERIDADES = ['baja', 'media', 'alta', 'critica'];

const TITULOS = {
  calidad: [
    'Desviación de tono en recubrimiento antirreflectante',
    'Microgrietas detectadas en inspección EL',
    'Lote con burbujas en encapsulado EVA',
    'Sellado deficiente en junction box',
  ],
  mantenimiento: [
    'Vibración anómala en bomba de vacío de laminadora',
    'Fuga de aire en cilindro del stringer',
    'Rodamiento desgastado en horno de difusión',
    'Calibración pendiente en flash tester',
  ],
  seguridad: [
    'Derrame de pasta de plata en impresora de contactos',
    'EPIs incompletos en zona de laminación',
    'Cable expuesto en mesa de layup',
    'Puerta de seguridad del horno con cierre defectuoso',
  ],
  produccion: [
    'Parada por atasco de células en texturizado',
    'Baja presión de vacío en laminadora',
    'Desalineación de serigrafía en impresora',
    'Flujo de N2 insuficiente en línea PECVD',
  ],
};

const NOTAS = [
  'Detectado en inspección de turno. Se ha aislado el lote afectado para revisión.',
  'Se notificó al responsable de línea. Pendiente de planificar intervención.',
  'Corregido con ajuste de parámetros. Se repite la validación en el próximo lote.',
  'Requiere repuesto. Pedido realizado al proveedor, llegada estimada en 72h.',
  'Se realizó intervención preventiva completa y se cerró con verificación OK.',
  'En seguimiento: se ha reducido la velocidad de línea como medida temporal.',
];

async function main() {
  await c.connect();
  const TENANT = 1;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Datos base: operario (reported_by), workstations, admin (para las creadas
  // por este script, mismo reported_by que el seed original)
  const opRes = await c.query(
    "SELECT id FROM users WHERE tenant_id=$1 AND role='operario' ORDER BY username LIMIT 3",
    [TENANT]
  );
  const operarios = opRes.rows.map((r) => r.id);
  const adminRes = await c.query(
    "SELECT id FROM users WHERE tenant_id=$1 AND role='tenant_admin' LIMIT 1",
    [TENANT]
  );
  const adminId = adminRes.rows[0]?.id;
  if (!adminId) {
    console.error('  ✗ No hay tenant_admin. Crear usuario admin antes.');
    process.exit(1);
  }
  const wsRes = await c.query(
    'SELECT id, code FROM workstations WHERE tenant_id=$1 AND status=$2 ORDER BY code',
    [TENANT, 'active']
  );
  const workstations = wsRes.rows;
  if (operarios.length === 0 || workstations.length === 0) {
    console.error('  ✗ Faltan operarios o workstations. Ejecutar seeds previos.');
    process.exit(1);
  }

  // Limpiar incidencias generadas por este script (idempotente, por reported_by del admin)
  const del = await c.query(
    'DELETE FROM incidencias WHERE tenant_id=$1 AND reported_by=$2',
    [TENANT, adminId]
  );
  console.log(`  • Incidencias previas del script borradas: ${del.rowCount}`);

  let creadas = 0;
  for (let i = 0; i < 18; i++) {
    const tipo = elegir(TIPOS);
    const diasAtras = Math.floor(rnd() * 90);
    const creadaEn = new Date(hoy);
    creadaEn.setDate(hoy.getDate() - diasAtras);
    creadaEn.setHours(entre(6, 22), entre(0, 59), 0, 0);

    // Estado según antigüedad: >20 días → cerrado/resuelto; 8-20 → resuelto;
    // <8 → abierto/en_progreso
    let status;
    if (diasAtras > 20) status = rnd() < 0.5 ? 'cerrado' : 'resuelto';
    else if (diasAtras > 8) status = 'resuelto';
    else status = rnd() < 0.5 ? 'abierto' : 'en_progreso';

    const ws = elegir(workstations);
    const severidad = elegir(SEVERIDADES);
    const resueltaEn = status === 'cerrado' || status === 'resuelto'
      ? new Date(creadaEn.getTime() + (24 + rnd() * 96) * 3600000)
      : null;

    await c.query(
      `INSERT INTO incidencias
        (id, tenant_id, workstation_id, reported_by, type, severity, title, description,
         status, resolved_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,
      [uuid(), TENANT, ws.id, adminId, tipo, severidad, elegir(TITULOS[tipo]),
       elegir(NOTAS), status, resueltaEn, creadaEn]
    );
    creadas++;
  }

  const total = await c.query('SELECT count(*) FROM incidencias WHERE tenant_id=$1', [TENANT]);
  console.log(`\n✅ ${creadas} incidencias históricas creadas (total en demo: ${total.rows[0].count})`);
  await c.end();
}

main().catch((e) => { console.error('FATAL:', e.message.slice(0, 300)); process.exit(1); });
