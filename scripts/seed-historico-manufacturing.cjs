// Seed de HISTÓRICO — Fábrica de Placas Solares DEMO (tenant 1)
// Genera 90 días de producción realista para que el panel (OEE, Quality, Cost)
// parezca una fábrica viva: órdenes, bloques de producción/parada, controles de
// calidad y entradas de coste por orden.
//
// Uso: PGHOST=... PGPASSWORD=... node scripts/seed-historico-manufacturing.cjs
// Idempotente: si ya hay work_blocks históricos (>1500), NO duplica.
// Semilla determinista (seedRnd=42): misma BD = mismos datos, reproducible.

const pg = require('pg');
const crypto = require('crypto');

const POOL = new pg.Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'neondb_owner',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'neondb',
  ssl: String(process.env.PGSSLMODE || 'require').toLowerCase() !== 'disable'
    ? { rejectUnauthorized: false } : false,
});

function uuid() { return crypto.randomUUID(); }

// Semilla determinista reproducible (misma ejecución = mismos datos)
let seedRnd = 42;
function rnd() {
  seedRnd = (seedRnd * 1103515245 + 12345) % 2147483648;
  return seedRnd / 2147483648;
}
function entre(min, max) { return Math.round(min + rnd() * (max - min)); }
function elegir(arr) { return arr[Math.floor(rnd() * arr.length)]; }

// Motivos de parada realistas de una línea de fabricación de paneles solares
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
  console.log('→ Seed HISTÓRICO Manufacturing (90 días) — Fábrica de Placas Solares DEMO...');

  // Idempotencia: si ya hay histórico real, no duplicar
  const countRes = await POOL.query(
    "SELECT COUNT(*) AS n FROM production_work_blocks WHERE start_time < NOW() - INTERVAL '1 day'"
  );
  const yaTieneHistorico = parseInt(countRes.rows[0].n, 10);
  if (yaTieneHistorico > 1500) {
    console.log(`  • Ya existe histórico (${yaTieneHistorico} bloques). No se duplica.`);
    await POOL.end();
    return;
  }
  console.log(`  • Bloques históricos actuales: ${yaTieneHistorico}. Generando...`);

  const TENANT = 1;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Datos base: workstations, modelos, operario
  const wsRes = await POOL.query(
    'SELECT id, code, name FROM workstations WHERE tenant_id=$1 AND status=$2 ORDER BY code',
    [TENANT, 'active']
  );
  const workstations = wsRes.rows;
  if (workstations.length === 0) {
    console.error('  ✗ No hay workstations activas. Ejecutar antes seed-solar-factory.cjs');
    process.exit(1);
  }
  console.log(`  • ${workstations.length} workstations`);

  const modRes = await POOL.query(
    'SELECT id, name, target_rate FROM manufacturing_models WHERE tenant_id=$1 ORDER BY name',
    [TENANT]
  );
  const models = modRes.rows;
  if (models.length === 0) {
    console.error('  ✗ No hay modelos. Ejecutar antes seed-models-solar.cjs');
    process.exit(1);
  }
  console.log(`  • ${models.length} modelos`);

  const opRes = await POOL.query(
    "SELECT id FROM users WHERE tenant_id=$1 AND role='operario' ORDER BY username",
    [TENANT]
  );
  const operarios = opRes.rows.map((r) => r.id);
  if (operarios.length === 0) {
    console.error('  ✗ No hay operarios en tenant 1. Ejecutar antes seed-operarios-demo.cjs');
    process.exit(1);
  }
  console.log(`  • ${operarios.length} operarios en plantilla`);

  // Asignar modelo a cada workstation (rotativo pero determinista)
  function modeloParaWorkstation(wsIndex) {
    return models[wsIndex % models.length];
  }
  // Operario de turno: rotativo determinista por (día + workstation)
  function operarioPara(wi, d) {
    return operarios[(wi + d) % operarios.length];
  }

  let ordersCreadas = 0;
  let bloquesCreados = 0;
  let qualityCreados = 0;
  let costCreados = 0;

  // 90 días hacia atrás (hoy incluido)
  for (let d = 90; d >= 0; d--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - d);
    const diaSemana = fecha.getDay();
    // Domingos: producción reducida (solo 1 turno en media línea); sábados: 2 turnos
    const esDomingo = diaSemana === 0;
    const esSabado = diaSemana === 6;
    const nTurnos = esDomingo ? 1 : esSabado ? 2 : 3;
    const factorDia = esDomingo ? 0.35 : esSabado ? 0.6 : 1;
    const esHoy = d === 0;
    const fechaISO = fecha.toISOString().slice(0, 10);

    for (let wi = 0; wi < workstations.length; wi++) {
      const ws = workstations[wi];
      const modelo = modeloParaWorkstation(wi);
      const targetRate = parseFloat(modelo.target_rate);

      // ~10% de workstations no producen ese día (parada total programada)
      if (rnd() < 0.10) continue;

      // 1 orden por día y workstation (completada salvo la de hoy)
      const orderId = uuid();
      const qtyObjetivo = Math.round(targetRate * 8 * factorDia * entre(85, 105) / 100);
      await POOL.query(
        `INSERT INTO orders (id, tenant_id, model_id, workstation_id, quantity, status,
           created_by, custom_fields, produced_quantity, defect_quantity, code, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'system','{}',$7,$8,$9,$10,$10)`,
        [orderId, TENANT, modelo.id, ws.id, qtyObjetivo,
         esHoy ? 'in_progress' : 'completed',
         0, 0, modelo.name, fecha]
      );
      ordersCreadas++;

      // Turnos de producción
      const turnos = [
        [6, 14],   // mañana
        [14, 22],  // tarde
        [22, 6],   // noche (cruza medianoche, se corta a medianoche)
      ];
      let producidoTotal = 0;
      let defectosTotal = 0;

      for (let t = 0; t < nTurnos; t++) {
        const [hIni, hFin] = turnos[t];
        const start = new Date(fecha);
        start.setHours(hIni, 0, 0, 0);

        let end;
        if (hFin > hIni) {
          end = new Date(fecha);
          end.setHours(hFin, 0, 0, 0);
        } else {
          // turno de noche que cruza: cortar a medianoche
          end = new Date(fecha);
          end.setHours(23, 59, 0, 0);
        }
        if (end <= start) continue;
        if (end > hoy) end = hoy; // no escribir en el futuro

        // Parada dentro del turno con probabilidad ~35%
        const hayParada = rnd() < 0.35;
        let bloquesTurno = [];

        if (hayParada) {
          // parada de 10-45 min en algún punto del turno
          const durParadaMin = entre(10, 45);
          const paradaStart = new Date(start.getTime() + entre(30, Math.max(60, (end - start) / 60000 - 60)) * 60000);
          const paradaEnd = new Date(Math.min(paradaStart.getTime() + durParadaMin * 60000, end.getTime()));
          if (paradaEnd > paradaStart && paradaEnd <= hoy) {
            await POOL.query(
              `INSERT INTO production_work_blocks
                (id, tenant_id, order_id, workstation_id, operator_id, type, start_time, end_time,
                 downtime_reason, produced_quantity, defect_quantity, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,'parada',$6,$7,$8,0,0,$6,$7)`,
              [uuid(), TENANT, orderId, ws.id, operarioPara(wi, d), paradaStart, paradaEnd,
               elegir(DOWNTIME_REASONS)]
            );
            bloquesCreados++;
          }
        }

        // producción restante del turno (1-2 bloques)
        const nBloquesProd = hayParada ? 2 : 1;
        const horasTurno = (end - start) / 3600000;
        const horasParada = hayParada ? entre(10, 45) / 60 : 0;
        const horasProd = horasTurno - horasParada;
        if (horasProd <= 0.2) continue;

        let acum = start.getTime();
        for (let b = 0; b < nBloquesProd; b++) {
          const esUltimo = b === nBloquesProd - 1;
          let bStart = new Date(acum);
          let bEnd = esUltimo ? end : new Date(acum + (horasProd / nBloquesProd) * 3600000 * 0.85);
          if (bEnd > end) bEnd = end;
          if (bEnd <= bStart) break;
          if (bEnd > hoy) bEnd = hoy;

          const horasBloque = (bEnd - bStart) / 3600000;
          // rendimiento realista 65-95% del target
          const rendimiento = 0.65 + rnd() * 0.30;
          const producido = Math.round(targetRate * horasBloque * rendimiento);
          const defectos = Math.round(producido * (0.005 + rnd() * 0.025)); // 0.5-3%
          producidoTotal += producido;
          defectosTotal += defectos;

          if (bEnd > bStart) {
            await POOL.query(
              `INSERT INTO production_work_blocks
                (id, tenant_id, order_id, workstation_id, operator_id, type, start_time, end_time,
                 downtime_reason, produced_quantity, defect_quantity, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,'produccion',$6,$7,NULL,$8,$9,$6,$7)`,
              [uuid(), TENANT, orderId, ws.id, operarioPara(wi, d), bStart, bEnd, producido, defectos]
            );
            bloquesCreados++;
            acum = bEnd.getTime();
          }
        }
      }

      // Actualizar la orden con lo producido (solo días completados)
      if (!esHoy) {
        await POOL.query(
          'UPDATE orders SET produced_quantity=$1, defect_quantity=$2 WHERE id=$3',
          [producidoTotal, defectosTotal, orderId]
        );

        // Control de calidad (~70% de órdenes): 1 check por orden
        if (rnd() < 0.7 && producidoTotal > 0) {
          const result = defectosTotal === 0 ? 'pass' : defectosTotal <= 5 ? 'conditional' : 'fail';
          await POOL.query(
            `INSERT INTO quality_checks
              (id, tenant_id, order_id, workstation_id, inspector_id, result, defect_count,
               defect_type, notes, checked_at, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
            [uuid(), TENANT, orderId, ws.id, elegir(INSPECTORES), result, defectosTotal,
             defectosTotal > 0 ? elegir(DEFECT_TYPES) : null,
             result === 'pass' ? 'Lote conforme' : 'Revisar no conformidades',
             new Date(fecha.getTime() + (16 + rnd() * 6) * 3600000)]
          );
          qualityCreados++;
        }

        // Costes (~60% de órdenes): material + labor + energy + overhead
        if (rnd() < 0.6) {
          const cats = [
            ['material', 0.6],
            ['labor', 0.25],
            ['energy', 0.1],
            ['overhead', 0.05],
          ];
          for (const [cat, peso] of cats) {
            const base = producidoTotal * (0.8 + rnd() * 0.8); // coste unitario aproximado
            await POOL.query(
              `INSERT INTO cost_entries (id, tenant_id, order_id, category, amount, currency, description, created_at)
               VALUES ($1,$2,$3,$4,$5,'EUR',$6,$7)`,
              [uuid(), TENANT, orderId, cat, Math.round(base * peso * 100) / 100,
               `Coste ${cat} - ${ws.code} - ${fechaISO}`, fecha]
            );
            costCreados++;
          }
        }
      }
    }

    if (d % 15 === 0) {
      console.log(`  • día ${fechaISO}: ${ordersCreadas} órdenes, ${bloquesCreados} bloques...`);
    }
  }

  console.log('\n✅ Seed histórico completado:');
  console.log(`  • Órdenes:      ${ordersCreadas}`);
  console.log(`  • Work blocks:  ${bloquesCreados}`);
  console.log(`  • Quality:      ${qualityCreados}`);
  console.log(`  • Cost entries: ${costCreados}`);
  await POOL.end();
}

main().catch((e) => { console.error('FATAL:', e.message.slice(0, 300)); process.exit(1); });
