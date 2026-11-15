// Simulación de la jornada — Fábrica de snacks DEMO (SnackPro Alimentación, tenant 100, base kavana_mes)
// Mantiene la demo "viva": genera los partes y las órdenes de la JORNADA en curso, con el
// calendario de planta (scripts/planta-calendario.cjs, hora de Madrid):
//   - la jornada del día D va de las 22:00 de D-1 a las 22:00 de D (noche, mañana, tarde);
//   - la semana empieza el domingo a las 22:00 y acaba el viernes a las 22:00;
//   - 1 o 2 sábados al mes se trabaja solo la mañana; el resto del fin de semana, cerrado.
//
// Uso:
//   node simulate-manufacturing-demo.cjs                  -> jornada en curso, hasta ahora (cron cada hora)
//   node simulate-manufacturing-demo.cjs 2026-11-13       -> regenera esa jornada entera (día laborable)
//   node simulate-manufacturing-demo.cjs --limpiar=10     -> además, mira 10 días atrás por actividad fuera de calendario (por defecto 3)
//
// Determinista por jornada (misma jornada = mismos datos) e idempotente: borra y regenera solo
// lo que creó el simulador en esa jornada (órdenes created_by='system' y sus bloques).
// Con la planta cerrada no genera nada. Además retira la actividad del simulador de los
// últimos días que caiga fuera del calendario (p. ej. datos de un domingo hechos con la versión anterior).

'use strict';
const crypto = require('crypto');
const { getClient } = require('./db.cjs');
const cal = require('./planta-calendario.cjs');

const c = getClient();
const TENANT = 100;

function uuid() { return crypto.randomUUID(); }

// Semilla determinista por jornada (se fija en main). LCG.
let seedRnd = 1;
function rnd() {
  seedRnd = (seedRnd * 1103515245 + 12345) % 2147483648;
  return seedRnd / 2147483648;
}
function entre(min, max) { return Math.round(min + rnd() * (max - min)); }
function elegir(arr) { return arr[Math.floor(rnd() * arr.length)]; }

// Las mismas claves que ya usa el Pareto de paradas de la demo.
const DOWNTIME_REASONS = [
  'mantenimiento_menor',
  'cambio_formato',
  'limpieza',
  'ajuste_linea',
  'falta_material',
  'averia_menor',
];

const OPERARIO_PRODUCCION = "username ~ '^op[0-9]+$'";

/** Quita órdenes del simulador y sus bloques, en una transacción (nunca deja bloques sueltos). */
async function borrarOrdenes(ids) {
  if (ids.length === 0) return 0;
  await c.query('BEGIN');
  try {
    await c.query('DELETE FROM production_work_blocks WHERE tenant_id=$1 AND order_id = ANY($2::uuid[])', [TENANT, ids]);
    await c.query('DELETE FROM orders WHERE tenant_id=$1 AND id = ANY($2::uuid[])', [TENANT, ids]);
    await c.query('COMMIT');
    return ids.length;
  } catch (e) {
    await c.query('ROLLBACK');
    console.error(`  ⚠ No se pudieron quitar ${ids.length} órdenes (se dejan como están): ${e.message.slice(0, 160)}`);
    return 0;
  }
}

async function main() {
  await c.connect();
  const ahora = new Date();

  const arg = process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const argLimpiar = process.argv.slice(2).find((a) => a.startsWith('--limpiar='));
  const diasLimpieza = argLimpiar ? Math.max(1, parseInt(argLimpiar.split('=')[1], 10) || 3) : 3;

  // Jornada a simular: la del argumento (entera) o la que toca ahora (hasta ahora).
  let objetivo = null;
  let limite = ahora;
  if (arg) {
    const turnos = cal.turnosDeJornada(arg);
    if (turnos.length === 0) {
      console.log(`→ ${arg} no es día laborable en el calendario de planta: no se simula nada.`);
    } else {
      objetivo = { jornada: arg, turnos };
      limite = turnos[turnos.length - 1].fin;
    }
  } else {
    objetivo = cal.jornadaASimular(ahora);
  }

  // 0) Fuera de calendario: actividad del simulador de los últimos días que no cae en ninguna jornada abierta.
  const hoyIso = cal.isoDeInstante(ahora);
  const ventanas = [];
  for (let n = -(diasLimpieza + 1); n <= 1; n++) {
    const turnos = cal.turnosDeJornada(cal.sumarDias(hoyIso, n));
    if (turnos.length > 0) ventanas.push([turnos[0].inicio.getTime(), turnos[turnos.length - 1].fin.getTime()]);
  }
  const recientes = await c.query(
    `SELECT id, created_at FROM orders WHERE tenant_id=$1 AND created_by='system' AND created_at >= $2`,
    [TENANT, new Date(ahora.getTime() - diasLimpieza * 86400000)]
  );
  const fuera = recientes.rows
    .filter((r) => {
      const t = new Date(r.created_at).getTime();
      return !ventanas.some(([ini, fin]) => t >= ini && t < fin);
    })
    .map((r) => r.id);
  const quitadasFuera = await borrarOrdenes(fuera);
  console.log(`→ Simulación Manufacturing (hora de Madrid ${cal.isoDeInstante(ahora)})`);
  console.log(`  • Actividad del simulador fuera de calendario retirada: ${quitadasFuera}`);

  // Caducan las órdenes del visitante (24 h) y se cierran las en curso de jornadas anteriores.
  if (!arg) {
    const caducadas = await c.query(
      `DELETE FROM orders WHERE tenant_id=$1 AND created_at < $2
         AND created_by = (SELECT id::text FROM users WHERE tenant_id=$1 AND username='1094')
         AND NOT EXISTS (SELECT 1 FROM production_work_blocks b WHERE b.order_id = orders.id)
       RETURNING id`,
      [TENANT, new Date(ahora.getTime() - 24 * 3600 * 1000)]
    ).catch(() => ({ rowCount: 0 }));
    console.log(`  • Órdenes de visitante caducadas: ${caducadas.rowCount}`);
  }

  if (!objetivo) {
    console.log('  • Planta cerrada: no hay jornada que simular.');
    await c.end();
    return;
  }

  const { jornada, turnos } = objetivo;
  const inicioJ = turnos[0].inicio;
  const finJ = turnos[turnos.length - 1].fin;
  const jornadaTerminada = limite.getTime() >= finJ.getTime();
  const esSabado = cal.diaSemana(jornada) === 6;
  const fechaSeed = Number(jornada.replace(/-/g, ''));
  seedRnd = fechaSeed;
  console.log(
    `  • Jornada ${jornada} (${esSabado ? 'sábado de refuerzo, solo mañana' : `${turnos.length} turnos`}), ` +
    `${jornadaTerminada ? 'completa' : 'hasta ahora'}`
  );

  // 1) Quitar lo que generó el simulador en esta jornada (bloques primero, por la clave foránea).
  const previas = await c.query(
    `SELECT id FROM orders WHERE tenant_id=$1 AND created_by='system' AND created_at >= $2 AND created_at < $3`,
    [TENANT, inicioJ, finJ]
  );
  const quitadas = await borrarOrdenes(previas.rows.map((r) => r.id));
  console.log(`  • Órdenes del simulador de esa jornada quitadas: ${quitadas}`);

  // 2) Las órdenes en curso de jornadas anteriores se cierran.
  const abiertas = await c.query(
    "UPDATE orders SET status='completed' WHERE tenant_id=$1 AND status='in_progress' AND updated_at < $2 RETURNING id",
    [TENANT, inicioJ]
  );
  console.log(`  • Órdenes de jornadas anteriores cerradas: ${abiertas.rowCount}`);

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
    `SELECT id FROM users WHERE tenant_id=$1 AND role='operario' AND ${OPERARIO_PRODUCCION} ORDER BY username`,
    [TENANT]
  );
  const operarios = opRes.rows.map((r) => r.id);
  if (operarios.length === 0 || workstations.length === 0 || models.length === 0) {
    console.error('  ✗ Faltan datos base (workstations/modelos/operarios).');
    process.exit(1);
  }

  const nTurnos = turnos.length;
  // Un sábado de refuerzo trabajan menos puestos.
  const umbralProduce = esSabado ? 0.55 : 0.1;
  const producen = workstations.map(() => rnd() >= umbralProduce);

  // Tramos por turno: cada operario reparte el turno entre sus puestos (la tabla tiene una
  // restricción de exclusión por operario y rango horario: dos tramos del mismo operario no se pueden solapar).
  const tramos = [];
  turnos.forEach((turno, t) => {
    const porOperario = new Map();
    for (let wi = 0; wi < workstations.length; wi++) {
      if (!producen[wi]) continue;
      const operatorId = operarios[(wi + fechaSeed + t) % operarios.length];
      if (!porOperario.has(operatorId)) porOperario.set(operatorId, []);
      porOperario.get(operatorId).push(wi);
    }
    const span = turno.fin.getTime() - turno.inicio.getTime();
    for (const [operatorId, wis] of porOperario) {
      wis.forEach((wi, k) => {
        tramos.push({
          wi,
          operatorId,
          start: new Date(turno.inicio.getTime() + (span * k) / wis.length),
          end: new Date(turno.inicio.getTime() + (span * (k + 1)) / wis.length),
        });
      });
    }
  });

  let omitidos = 0;
  async function insertarBloque({ orderId, wsId, operatorId, tipo, start, end, motivo = null, producido = 0, defectos = 0 }) {
    try {
      await c.query(
        `INSERT INTO production_work_blocks
           (id, tenant_id, order_id, workstation_id, operator_id, client_event_id, type,
            start_time, end_time, downtime_reason, produced_quantity, defect_quantity,
            synced_at, registered_at, is_offline_event, version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,false,1)`,
        [uuid(), TENANT, orderId, wsId, operatorId, uuid(), tipo, start, end, motivo,
         producido, defectos, new Date()],
      );
      return true;
    } catch (e) {
      // 23P01: el operario ya tiene otro parte en ese rango (p. ej. de un visitante). Se omite y se sigue.
      if (e.code === '23P01') { omitidos++; return false; }
      throw e;
    }
  }

  // Una orden por puesto que produce en la jornada. En curso mientras dure; completada al terminar.
  const estadoOrden = jornadaTerminada ? 'completed' : 'in_progress';
  const ordenDe = new Map();
  const { rows: [{ maxcode }] } = await c.query(
    "SELECT COALESCE(MAX(code::int), 4000) AS maxcode FROM orders WHERE tenant_id=$1 AND code ~ '^[0-9]+$'", [TENANT]);
  let n = Number(maxcode);
  for (let wi = 0; wi < workstations.length; wi++) {
    if (!producen[wi]) continue;
    const ws = workstations[wi];
    const modelo = models[(wi + fechaSeed) % models.length];
    const targetRate = parseFloat(modelo.target_rate);
    const orderId = uuid();
    n++;
    const qtyObjetivo = Math.round((targetRate * 8 * nTurnos * entre(85, 105)) / 100);
    await c.query(
      `INSERT INTO orders (id, tenant_id, model_id, workstation_id, quantity, status,
         created_by, custom_fields, produced_quantity, defect_quantity, code, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'system','{}',0,0,$7,$8,$8)`,
      [orderId, TENANT, modelo.id, ws.id, qtyObjetivo, estadoOrden, String(n), inicioJ]
    );
    ordenDe.set(wi, { orderId, targetRate });
  }

  // Bloques de la jornada (sin solapar tramos del mismo operario; nada posterior a "ahora").
  const totales = new Map();
  let bloquesCreados = 0;
  for (const tramo of tramos) {
    const ws = workstations[tramo.wi];
    const { orderId, targetRate } = ordenDe.get(tramo.wi);
    const { start, operatorId } = tramo;
    const end = new Date(Math.min(tramo.end.getTime(), limite.getTime()));
    if (end <= start) continue;
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
      } else if (await insertarBloque({
        orderId, wsId: ws.id, operatorId, tipo: 'parada',
        start: paradaStart, end: paradaEnd, motivo: elegir(DOWNTIME_REASONS),
      })) {
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
      if (horas <= 0.1) continue;
      const rendimiento = 0.65 + rnd() * 0.3;
      const producido = Math.round(targetRate * horas * rendimiento);
      const defectos = Math.round(producido * (0.005 + rnd() * 0.025));
      if (await insertarBloque({
        orderId, wsId: ws.id, operatorId, tipo: 'produccion',
        start: h0, end: h1, producido, defectos,
      })) {
        bloquesCreados++;
        producidoOrden += producido;
        defectosOrden += defectos;
      }
    }

    const acumulado = totales.get(orderId) ?? { producido: 0, defectos: 0 };
    acumulado.producido += producidoOrden;
    acumulado.defectos += defectosOrden;
    totales.set(orderId, acumulado);
  }

  // El avance de cada orden sale de sus bloques.
  const actualizadoEn = jornadaTerminada ? new Date(finJ.getTime() - 60000) : new Date();
  for (const [orderId, t] of totales) {
    await c.query(
      `UPDATE orders SET produced_quantity=$1, defect_quantity=$2, updated_at=$5
       WHERE tenant_id=$3 AND id=$4`,
      [t.producido, t.defectos, TENANT, orderId, actualizadoEn],
    );
  }

  console.log(`\n✅ Simulación completada: ${ordenDe.size} órdenes, ${bloquesCreados} bloques${omitidos ? `, ${omitidos} omitidos por solape de operario` : ''}`);
  await c.end();
}

main().catch((e) => { console.error('FATAL:', e.message.slice(0, 300)); process.exit(1); });
