// Simulación diaria — Fábrica de Placas Solares DEMO (tenant 1)
// Mantiene la demo "viva": cada día genera los work_blocks y la orden de HOY
// para las 15 workstations (semilla determinista por fecha: misma fecha = mismos
// datos, aunque se ejecute varias veces).
//
// Uso: PGHOST=... PGPASSWORD=*** node scripts/simulate-daily-manufacturing.cjs
// Cron: 06:00 cada día (VPS UTC). Idempotente: borra los work_blocks de hoy y
// los regenera. El histórico de días anteriores NO se toca.

('pg');
const crypto = require('crypto');
const { getClient } = require('./db.cjs');

const c = getClient();

function uuid() { return crypto.randomUUID(); }

// Semilla determinista POR FECHA (misma fecha = misma secuencia de datos, aunque
// el script se ejecute varias veces al día). LCG con semilla = YYYYMMDD.
let seedRnd = (() => {
  const hoy = new Date();
  return hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate();
})();
function rnd() {
  seedRnd = (seedRnd * 1103515245 + 12345) % 2147483648;
  return seedRnd / 2147483648;
}
function entre(min, max) { return Math.round(min + rnd() * (max - min)); }
function elegir(arr) { return arr[Math.floor(rnd() * arr.length)]; }

const DOWNTIME_REASONS = [
  'cambio de troquel',
  'mantenimiento preventivo',
  'espera de material',
  'ajuste de línea',
  'cambio de modelo',
  'limpieza de línea',
  'avería menor',
  'formación de operario',
  'inspección EL manual',
  'pausa programada',
];

const DEFECT_TYPES = [
  'rotura de célula',
  'grieta en vidrio',
  'delaminación',
  'defecto de serigrafía',
  'celda desconectada',
  'marcas de manipulación',
  'burbuja en encapsulado',
];

const INSPECTORES = ['047', '1094'];

async function main() {
  const TENANT = 1;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diaSemana = hoy.getDay();
  const esDomingo = diaSemana === 0;
  const esSabado = diaSemana === 6;
  const fechaISO = hoy.toISOString().slice(0, 10);
  console.log(`→ Simulación diaria Manufacturing (${fechaISO}, ${esDomingo ? 'domingo' : esSabado ? 'sábado' : 'laborable'})`);

  // 1) Limpiar work_blocks de hoy (idempotente: regenera, no duplica)
  const del = await c.query(
    'DELETE FROM production_work_blocks WHERE tenant_id=$1 AND start_time >= $2',
    [TENANT, hoy]
  );
  console.log(`  • Work blocks de hoy limpiados: ${del.rowCount}`);

  // 1b) Limpiar órdenes de hoy creadas por el simulador O el visitante (1094).
  //     Idempotente: no acumular en cada ejecución; el visitante de la demo
  //     también caduca a las 24h (sus órdenes se regeneran con la simulación).
  const delOrd = await c.query(
    `DELETE FROM orders
     WHERE tenant_id=$1 AND created_at >= $2
       AND (created_by='system'
            OR created_by = (SELECT id::text FROM users WHERE tenant_id=$1 AND username='1094'))`,
    [TENANT, hoy]
  );
  console.log(`  • Órdenes de hoy limpiadas: ${delOrd.rowCount}`);

  // 2) Cerrar órdenes de días anteriores que quedaron in_progress
  const abiertas = await c.query(
    "UPDATE orders SET status='completed' WHERE tenant_id=$1 AND status='in_progress' AND updated_at < $2 RETURNING id",
    [TENANT, hoy]
  );
  console.log(`  • Órdenes de ayer cerradas: ${abiertas.rowCount}`);

  // Datos base
  const wsRes = await c.query(
    'SELECT id, code, name FROM workstations WHERE tenant_id=$1 AND status=$2 ORDER BY code',
    [TENANT, 'active']
  );
  const workstations = wsRes.rows;
  const modRes = await c.query(
    'SELECT id, name, target_rate FROM manufacturing_models WHERE tenant_id=$1 ORDER BY name',
    [TENANT]
  );
  const models = modRes.rows;
  const opRes = await c.query(
    "SELECT id FROM users WHERE tenant_id=$1 AND role='operario' ORDER BY username",
    [TENANT]
  );
  const operarios = opRes.rows.map((r) => r.id);
  if (operarios.length === 0 || workstations.length === 0 || models.length === 0) {
    console.error('  ✗ Faltan datos base (workstations/modelos/operarios).');
    process.exit(1);
  }
  // Operario de turno: rotativo determinista por (workstation + día)
  const fechaSeed = hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate();
  function operarioPara(wi) {
    return operarios[(wi + fechaSeed) % operarios.length];
  }

  const nTurnos = esDomingo ? 1 : esSabado ? 2 : 3;
  const factorDia = esDomingo ? 0.35 : esSabado ? 0.6 : 1;

  let ordersCreadas = 0;
  let bloquesCreados = 0;

  for (let wi = 0; wi < workstations.length; wi++) {
    const ws = workstations[wi];
    const modelo = models[wi % models.length];
    const targetRate = parseFloat(modelo.target_rate);

    // ~10% de workstations no producen hoy
    if (rnd() < 0.10) continue;

    // Orden de hoy (in_progress, se cierra mañana)
    const orderId = uuid();
    const qtyObjetivo = Math.round(targetRate * 8 * factorDia * entre(85, 105) / 100);
    await c.query(
      `INSERT INTO orders (id, tenant_id, model_id, workstation_id, quantity, status,
         created_by, custom_fields, produced_quantity, defect_quantity, code, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'in_progress','system','{}',0,0,$6,$7,$7)`,
      [orderId, TENANT, modelo.id, ws.id, qtyObjetivo, modelo.name, hoy]
    );
    ordersCreadas++;

    const turnos = [[6, 14], [14, 22], [22, 24]];
    for (let t = 0; t < nTurnos; t++) {
      const [hIni, hFin] = turnos[t];
      const start = new Date(hoy);
      start.setHours(hIni, 0, 0, 0);
      let end = new Date(hoy);
      end.setHours(hFin, 0, 0, 0);
      if (hFin === 24) end = new Date(hoy); end.setHours(23, 59, 0, 0);
      if (end <= start) continue;

      const hayParada = rnd() < 0.35;
      if (hayParada) {
        const durParadaMin = entre(10, 45);
        const paradaStart = new Date(start.getTime() + entre(30, Math.max(60, (end - start) / 60000 - 60)) * 60000);
        const paradaEnd = new Date(Math.min(paradaStart.getTime() + durParadaMin * 60000, end.getTime()));
        if (paradaEnd > paradaStart) {
          await c.query(
            `INSERT INTO production_work_blocks
              (id, tenant_id, order_id, workstation_id, operator_id, type, start_time, end_time,
               downtime_reason, produced_quantity, defect_quantity, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,'parada',$6,$7,$8,0,0,$6,$7)`,
            [uuid(), TENANT, orderId, ws.id, operarioPara(wi), paradaStart, paradaEnd,
             elegir(DOWNTIME_REASONS)]
          );
          bloquesCreados++;
        }
      }

      const horasTurno = (end - start) / 3600000;
      const horasParada = hayParada ? entre(10, 45) / 60 : 0;
      const horasProd = horasTurno - horasParada;
      if (horasProd <= 0.2) continue;

      const nBloquesProd = hayParada ? 2 : 1;
      let acum = start.getTime();
      for (let b = 0; b < nBloquesProd; b++) {
        const esUltimo = b === nBloquesProd - 1;
        let bStart = new Date(acum);
        let bEnd = esUltimo ? end : new Date(acum + (horasProd / nBloquesProd) * 3600000 * 0.85);
        if (bEnd > end) bEnd = end;
        if (bEnd <= bStart) break;

        const horasBloque = (bEnd - bStart) / 3600000;
        const rendimiento = 0.65 + rnd() * 0.30;
        const producido = Math.round(targetRate * horasBloque * rendimiento);
        const defectos = Math.round(producido * (0.005 + rnd() * 0.025));

        await c.query(
          `INSERT INTO production_work_blocks
            (id, tenant_id, order_id, workstation_id, operator_id, type, start_time, end_time,
             downtime_reason, produced_quantity, defect_quantity, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,'produccion',$6,$7,NULL,$8,$9,$6,$7)`,
          [uuid(), TENANT, orderId, ws.id, operarioPara(wi), bStart, bEnd, producido, defectos]
        );
        bloquesCreados++;
        acum = bEnd.getTime();
      }
    }
  }

  console.log(`\n✅ Simulación diaria completada:`);
  console.log(`  • Órdenes de hoy:  ${ordersCreadas}`);
  console.log(`  • Work blocks hoy: ${bloquesCreados}`);
  await c.end();
}

main().catch((e) => { console.error('FATAL:', e.message.slice(0, 300)); process.exit(1); });
