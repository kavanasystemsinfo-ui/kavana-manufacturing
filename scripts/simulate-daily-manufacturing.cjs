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
  // Conexión explícita: con pg 8.23 la conexión perezosa (llamar a query sin
  // connect) hace que el proceso salga con código 0 sin ejecutar nada, y eso
  // convierte este script en un no-op silencioso cuando va por cron.
  await c.connect();
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

  // Quién produce hoy (determinista) y con qué operario. Con 10 operarios y 15
  // puestos varios puestos comparten operario en el mismo turno, y la tabla
  // tiene una restricción de exclusión por operario y rango horario: si dos
  // tramos del mismo operario se solapan, el INSERT se rechaza. Por eso cada
  // puesto recibe su propio subtramo dentro del turno.
  const producen = workstations.map(() => rnd() >= 0.1);
  const turnos = [[6, 14], [14, 22], [22, 24]];
  const tramos = [];

  for (let t = 0; t < nTurnos; t++) {
    const [hIni, hFin] = turnos[t];
    const ini = new Date(hoy);
    ini.setHours(hIni, 0, 0, 0);
    const fin = new Date(hoy);
    if (hFin === 24) fin.setHours(23, 59, 0, 0);
    else fin.setHours(hFin, 0, 0, 0);
    if (fin <= ini) continue;

    const porOperario = new Map();
    for (let wi = 0; wi < workstations.length; wi++) {
      if (!producen[wi]) continue;
      const operatorId = operarios[(wi + fechaSeed) % operarios.length];
      if (!porOperario.has(operatorId)) porOperario.set(operatorId, []);
      porOperario.get(operatorId).push(wi);
    }
    const span = fin.getTime() - ini.getTime();
    for (const [operatorId, wis] of porOperario) {
      wis.forEach((wi, k) => {
        tramos.push({
          wi,
          operatorId,
          start: new Date(ini.getTime() + (span * k) / wis.length),
          end: new Date(ini.getTime() + (span * (k + 1)) / wis.length),
        });
      });
    }
  }

  /** Inserta un bloque con las columnas REALES de la tabla (no created_at). */
  async function insertarBloque({ orderId, wsId, operatorId, tipo, start, end, motivo = null, producido = 0, defectos = 0 }) {
    await c.query(
      `INSERT INTO production_work_blocks
         (id, tenant_id, order_id, workstation_id, operator_id, client_event_id, type,
          start_time, end_time, downtime_reason, produced_quantity, defect_quantity,
          synced_at, registered_at, is_offline_event, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,false,1)`,
      [uuid(), TENANT, orderId, wsId, operatorId, uuid(), tipo, start, end, motivo,
       producido, defectos, new Date()],
    );
  }

  // La orden de hoy: una por puesto que produzca (se cierra mañana).
  const ordenDe = new Map();
  for (let wi = 0; wi < workstations.length; wi++) {
    if (!producen[wi]) continue;
    const ws = workstations[wi];
    const modelo = models[wi % models.length];
    const targetRate = parseFloat(modelo.target_rate);
    const orderId = uuid();
    const qtyObjetivo = Math.round((targetRate * 8 * factorDia * entre(85, 105)) / 100);
    await c.query(
      `INSERT INTO orders (id, tenant_id, model_id, workstation_id, quantity, status,
         created_by, custom_fields, produced_quantity, defect_quantity, code, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'in_progress','system','{}',0,0,$6,$7,$7)`,
      [orderId, TENANT, modelo.id, ws.id, qtyObjetivo, modelo.name, hoy]
    );
    ordenDe.set(wi, { orderId, targetRate });
    ordersCreadas++;
  }

  // Bloques del día: la producción ocupa SOLO el tiempo que deja libre la
  // parada, porque los tramos del mismo operario no pueden solaparse.
  const totales = new Map();
  for (const tramo of tramos) {
    const ws = workstations[tramo.wi];
    const { orderId, targetRate } = ordenDe.get(tramo.wi);
    const { start, end, operatorId } = tramo;
    const tramoMin = (end - start) / 60000;

    let paradaStart = null;
    let paradaEnd = null;
    if (rnd() < 0.35 && tramoMin > 40) {
      const durParadaMin = entre(10, Math.min(45, Math.max(10, Math.floor(tramoMin / 3))));
      const desde = entre(5, Math.max(10, Math.floor(tramoMin / 2)));
      paradaStart = new Date(start.getTime() + desde * 60000);
      paradaEnd = new Date(Math.min(paradaStart.getTime() + durParadaMin * 60000, end.getTime()));
      if (paradaEnd <= paradaStart) {
        paradaStart = null;
        paradaEnd = null;
      } else {
        await insertarBloque({
          orderId, wsId: ws.id, operatorId, tipo: 'parada',
          start: paradaStart, end: paradaEnd, motivo: elegir(DOWNTIME_REASONS),
        });
        bloquesCreados++;
      }
    }

    const huecos = [];
    if (paradaStart && paradaEnd) {
      if (paradaStart > start) huecos.push([start, paradaStart]);
      if (paradaEnd < end) huecos.push([paradaEnd, end]);
    } else {
      huecos.push([start, end]);
    }

    let producidoOrden = 0;
    let defectosOrden = 0;
    for (const [h0, h1] of huecos) {
      const horas = (h1 - h0) / 3600000;
      if (horas <= 0.2) continue;
      const rendimiento = 0.65 + rnd() * 0.3;
      const producido = Math.round(targetRate * horas * rendimiento);
      const defectos = Math.round(producido * (0.005 + rnd() * 0.025));
      await insertarBloque({
        orderId, wsId: ws.id, operatorId, tipo: 'produccion',
        start: h0, end: h1, producido, defectos,
      });
      bloquesCreados++;
      producidoOrden += producido;
      defectosOrden += defectos;
    }

    const acumulado = totales.get(orderId) ?? { producido: 0, defectos: 0 };
    acumulado.producido += producidoOrden;
    acumulado.defectos += defectosOrden;
    totales.set(orderId, acumulado);
  }

  // El avance de cada orden sale de sus bloques: la tarjeta del tablero lo pinta.
  for (const [orderId, t] of totales) {
    await c.query(
      `UPDATE orders SET produced_quantity=$1, defect_quantity=$2, updated_at=NOW()
       WHERE tenant_id=$3 AND id=$4`,
      [t.producido, t.defectos, TENANT, orderId],
    );
  }

  console.log(`\n✅ Simulación diaria completada:`);
  console.log(`  • Órdenes de hoy:  ${ordersCreadas}`);
  console.log(`  • Work blocks hoy: ${bloquesCreados}`);
  await c.end();
}

main().catch((e) => { console.error('FATAL:', e.message.slice(0, 300)); process.exit(1); });
