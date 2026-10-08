import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://kavana:kavana_v3_password@db:5432/kavana_v3'
});

const TENANT_ID = 1;

// Fechas objetivo: últimos 7 días hasta hoy (2026-10-08)
const TODAY = new Date('2026-10-08T23:59:59Z');
const START_DATE = new Date('2026-10-02T00:00:00Z'); // desde 2 de oct

// Helpers
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 2) => Number((Math.random() * (max - min) + min).toFixed(decimals));
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);
const addHours = (date, hours) => new Date(date.getTime() + hours * 3600000);
const randomDateInRange = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function getClient() {
  return await pool.connect();
}

async function fetchWorkstations(client) {
  const res = await client.query(
    'SELECT id FROM workstations WHERE tenant_id = $1 AND status = \'active\'',
    [TENANT_ID]
  );
  return res.rows.map(r => r.id);
}

async function fetchOperators(client) {
  const res = await client.query(
    'SELECT id FROM users WHERE tenant_id = $1 AND role = \'operario\'',
    [TENANT_ID]
  );
  return res.rows.map(r => r.id);
}

async function fetchModels(client) {
  const res = await client.query(
    'SELECT id, target_rate FROM manufacturing_models WHERE tenant_id = $1',
    [TENANT_ID]
  );
  return res.rows;
}

async function fetchOrders(client, startDate, endDate) {
  const res = await client.query(
    `SELECT id, quantity, workstation_id, status, created_at 
     FROM orders 
     WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
     ORDER BY created_at`,
    [TENANT_ID, startDate, endDate]
  );
  return res.rows;
}

async function createOrdersForDays(client, workstations, models, operators) {
  console.log('Creando órdenes para 3-8 octubre...');
  
  const statusWeights = { pending: 0.1, in_progress: 0.3, completed: 0.6 };
  let orderCount = 0;
  
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) { // 3-9 oct (hoy es 8)
    const dayStart = new Date(START_DATE);
    dayStart.setDate(dayStart.getDate() + dayOffset);
    dayStart.setHours(6, 0, 0, 0); // 6 AM inicio turno
    
    const ordersPerDay = randomBetween(8, 15);
    
    for (let i = 0; i < ordersPerDay; i++) {
      const ws = workstations[randomBetween(0, workstations.length - 1)];
      const model = models[randomBetween(0, models.length - 1)];
      const operator = operators[randomBetween(0, operators.length - 1)];
      
      const createdAt = addMinutes(dayStart, randomBetween(0, 600)); // 6AM-4PM
      const targetQty = randomBetween(500, 3000);
      
      // Determinar status basado en hora y peso
      let status = 'completed';
      const hour = createdAt.getHours();
      if (hour < 10) status = randomFloat(0, 1) < 0.3 ? 'pending' : 'in_progress';
      else if (hour < 16) status = randomFloat(0, 1) < 0.4 ? 'in_progress' : 'completed';
      
      const orderId = crypto.randomUUID();
      
      await client.query(
        `INSERT INTO orders (tenant_id, id, model_id, workstation_id, quantity, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         ON CONFLICT DO NOTHING`,
        [TENANT_ID, orderId, model.id, ws, targetQty, status, operator, createdAt]
      );
      orderCount++;
    }
  }
  
  console.log(`  → ${orderCount} órdenes creadas`);
  return orderCount;
}

async function createWorkBlocksForOrders(client, orders, operators) {
  console.log('Creando bloques de trabajo (producción y paradas)...');
  
  let blockCount = 0;
  
  for (const order of orders) {
    const orderDate = new Date(order.created_at);
    const isCompleted = order.status === 'completed';
    const isInProgress = order.status === 'in_progress';
    
    if (!isCompleted && !isInProgress) continue; // pending no tiene bloques aún
    
    const targetQty = order.quantity;
    let remainingQty = targetQty;
    let currentTime = addMinutes(orderDate, randomBetween(30, 120)); // empieza 30min-2h después
    const shiftEnd = new Date(orderDate);
    shiftEnd.setHours(22, 0, 0, 0); // turno termina 10PM
    
    const workstationId = order.workstation_id;
    const operatorId = operators[randomBetween(0, operators.length - 1)];
    
    // Crear bloques de producción hasta completar o llegar a fin de turno
    while (remainingQty > 0 && currentTime < shiftEnd) {
      const isProduction = randomFloat(0, 1) < 0.85; // 85% producción, 15% paradas
      
      if (isProduction) {
        const blockDuration = randomBetween(30, 180); // 30min-3h
        const blockEnd = addMinutes(currentTime, blockDuration);
        
        if (blockEnd > shiftEnd) break;
        
        // Cantidad producida en este bloque (velocidad variable)
        const ratePerHour = randomFloat(50, 300);
        const produced = Math.min(remainingQty, Math.round(ratePerHour * (blockDuration / 60) * randomFloat(0.7, 1.1)));
        const defects = Math.round(produced * randomFloat(0, 0.03)); // 0-3% defectos
        
        await client.query(
          `INSERT INTO production_work_blocks 
           (tenant_id, id, order_id, workstation_id, operator_id, client_event_id, 
            type, start_time, end_time, produced_quantity, defect_quantity, 
            observations, registered_at, device_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT DO NOTHING`,
          [
            TENANT_ID, crypto.randomUUID(), order.id, workstationId, operatorId, crypto.randomUUID(),
            'produccion', currentTime, blockEnd, produced, defects,
            produced > targetQty * 0.8 ? 'Final de orden' : 'Producción normal',
            currentTime, 'tablet-linea'
          ]
        );
        blockCount++;
        remainingQty -= produced;
        currentTime = blockEnd;
      } else {
        // Parada
        const downtimeReasons = ['Cambio de molde', 'Limpieza', 'Ajuste de parámetros', 'Falta material', 'Mantenimiento preventivo', 'Incidencia calidad'];
        const reason = downtimeReasons[randomBetween(0, downtimeReasons.length - 1)];
        const downtimeDuration = randomBetween(10, 90);
        const blockEnd = addMinutes(currentTime, downtimeDuration);
        
        if (blockEnd > shiftEnd) break;
        
        await client.query(
          `INSERT INTO production_work_blocks 
           (tenant_id, id, order_id, workstation_id, operator_id, client_event_id, 
            type, start_time, end_time, produced_quantity, downtime_reason, 
            observations, registered_at, device_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT DO NOTHING`,
          [
            TENANT_ID, crypto.randomUUID(), order.id, workstationId, operatorId, crypto.randomUUID(),
            'parada', currentTime, blockEnd, 0, reason,
            `Parada: ${reason}`, currentTime, 'tablet-linea'
          ]
        );
        blockCount++;
        currentTime = blockEnd;
      }
      
      // Pequeña pausa entre bloques
      currentTime = addMinutes(currentTime, randomBetween(5, 20));
    }
    
    // Si la orden está completada pero quedan bloques pendientes para hoy, añadir algunos más
    if (isCompleted && remainingQty <= 0 && randomFloat(0, 1) < 0.3) {
      // Bloque extra de limpieza/cambio
      const blockEnd = addMinutes(currentTime, randomBetween(15, 45));
      await client.query(
        `INSERT INTO production_work_blocks 
         (tenant_id, id, order_id, workstation_id, operator_id, client_event_id, 
          type, start_time, end_time, produced_quantity, downtime_reason, 
          observations, registered_at, device_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT DO NOTHING`,
        [
          TENANT_ID, crypto.randomUUID(), order.id, workstationId, operatorId, crypto.randomUUID(),
          'parada', currentTime, blockEnd, 0, 'Limpieza fin de orden',
          'Limpieza y preparación siguiente orden', currentTime, 'tablet-linea'
        ]
      );
      blockCount++;
    }
  }
  
  console.log(`  → ${blockCount} bloques de trabajo creados`);
  return blockCount;
}

async function createQualityChecks(client, orders) {
  console.log('Creando controles de calidad...');
  
  let qcCount = 0;
  const results = ['pass', 'pass', 'pass', 'pass', 'conditional', 'fail']; // 67% pass, 17% conditional, 17% fail
  const defectTypes = ['Dimensión fuera tolerancia', 'Defecto superficial', 'Peso incorrecto', 'Etiquetado erróneo', 'Contaminación cruzada'];
  
  // Solo órdenes completed o in_progress
  const relevantOrders = orders.filter(o => o.status === 'completed' || o.status === 'in_progress');
  
  for (const order of relevantOrders) {
    // 1-3 controles por orden
    const checksPerOrder = randomBetween(1, 3);
    const orderDate = new Date(order.created_at);
    
    for (let i = 0; i < checksPerOrder; i++) {
      const checkTime = addMinutes(orderDate, randomBetween(60, 600)); // 1h-10h después
      const result = results[randomBetween(0, results.length - 1)];
      const defectCount = result === 'pass' ? 0 : randomBetween(1, 8);
      const defectType = result !== 'pass' ? defectTypes[randomBetween(0, defectTypes.length - 1)] : null;
      
      await client.query(
        `INSERT INTO quality_checks 
         (tenant_id, id, order_id, workstation_id, inspector_id, result, defect_count, defect_type, notes, checked_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         ON CONFLICT DO NOTHING`,
        [
          TENANT_ID, crypto.randomUUID(), order.id, order.workstation_id, 'QC-' + randomBetween(100, 999),
          result, defectCount, defectType,
          result === 'pass' ? 'OK' : `Defecto: ${defectType} (${defectCount} uds)`,
          checkTime
        ]
      );
      qcCount++;
    }
  }
  
  console.log(`  → ${qcCount} controles de calidad creados`);
  return qcCount;
}

async function createOEEMetrics(client, workstations) {
  console.log('Creando métricas OEE diarias (últimos 7 días)...');
  
  let oeeCount = 0;
  
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) { // 2-8 oct
    const periodStart = new Date(START_DATE);
    periodStart.setDate(periodStart.getDate() + dayOffset);
    periodStart.setHours(6, 0, 0, 0); // 6 AM
    
    const periodEnd = new Date(periodStart);
    periodEnd.setHours(22, 0, 0, 0); // 10 PM
    
    for (const wsId of workstations) {
      // OEE realista: 65-95%
      const availability = randomFloat(75, 98, 1);
      const performance = randomFloat(70, 95, 1);
      const quality = randomFloat(90, 99.5, 1);
      const oee = Math.round((availability * performance * quality) / 10000 * 100) / 100;
      
      await client.query(
        `INSERT INTO oee_metrics 
         (tenant_id, workstation_id, period_start, period_end, availability, performance, quality, oee, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [TENANT_ID, wsId, periodStart, periodEnd, availability, performance, quality, oee, new Date()]
      );
      oeeCount++;
    }
  }
  
  console.log(`  → ${oeeCount} métricas OEE creadas`);
  return oeeCount;
}

async function createIncidencias(client, orders, workstations, operators) {
  console.log('Creando incidencias realistas...');
  
  let incCount = 0;
  const tipos = ['calidad', 'mantenimiento', 'produccion', 'seguridad', 'otro'];
  const estados = ['abierto', 'en_progreso', 'resuelto', 'cerrado'];
  
  // ~2-3 incidencias por día
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const dayStart = new Date(START_DATE);
    dayStart.setDate(dayStart.getDate() + dayOffset);
    
    const incPerDay = randomBetween(2, 4);
    
    for (let i = 0; i < incPerDay; i++) {
      const ws = workstations[randomBetween(0, workstations.length - 1)];
      const operator = operators[randomBetween(0, operators.length - 1)];
      const order = orders[randomBetween(0, orders.length - 1)];
      const createdAt = addMinutes(dayStart, randomBetween(60, 900));
      
      const tipo = tipos[randomBetween(0, tipos.length - 1)];
      const estado = estados[randomBetween(0, estados.length - 1)];
      
      const titulos = {
        calidad: 'Producto fuera de especificación',
        mantenimiento: 'Ruido anómalo en motor principal',
        produccion: 'Parámetros de proceso fuera de rango',
        seguridad: 'Protección de cinta transportadora dañada',
        otro: 'Incidencia diversa en línea'
      };
      
      const descripciones = {
        calidad: 'Producto fuera de especificación en control dimensional',
        mantenimiento: 'Ruido anómalo en motor principal, requiere revisión',
        produccion: 'Parámetros de temperatura fuera de rango, ajuste necesario',
        seguridad: 'Protección de cinta transportadora dañada, riesgo atrapamiento',
        otro: 'Incidencia operativa diversa, en investigación'
      };
      
      await client.query(
        `INSERT INTO incidencias 
         (tenant_id, id, workstation_id, order_id, reported_by, type, title, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         ON CONFLICT DO NOTHING`,
        [TENANT_ID, crypto.randomUUID(), ws, order.id, operator, tipo, titulos[tipo], descripciones[tipo], estado, createdAt]
      );
      incCount++;
    }
  }
  
  console.log(`  → ${incCount} incidencias creadas`);
  return incCount;
}

async function main() {
  console.log('=== POBLANDO ACTIVIDAD RECIENTE (3-8 OCTUBRE 2026) ===\n');
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Obtener datos base
    const workstations = await fetchWorkstations(client);
    const operators = await fetchOperators(client);
    const models = await fetchModels(client);
    
    console.log(`Workstations: ${workstations.length}`);
    console.log(`Operadores: ${operators.length}`);
    console.log(`Modelos: ${models.length}\n`);
    
    // Obtener órdenes recientes (incluyendo las que vamos a crear)
    const recentOrders = await fetchOrders(client, START_DATE, TODAY);
    console.log(`Órdenes existentes en rango: ${recentOrders.length}\n`);
    
    // 1. Crear nuevas órdenes para 3-8 oct
    await createOrdersForDays(client, workstations, models, operators);
    
    // Refrescar órdenes
    const allRecentOrders = await fetchOrders(client, START_DATE, TODAY);
    console.log(`\nTotal órdenes en rango tras seed: ${allRecentOrders.length}\n`);
    
    // 2. Bloques de trabajo
    await createWorkBlocksForOrders(client, allRecentOrders, operators);
    
    // 3. Controles de calidad
    await createQualityChecks(client, allRecentOrders);
    
    // 4. Métricas OEE
    await createOEEMetrics(client, workstations);
    
    // 5. Incidencias
    await createIncidencias(client, allRecentOrders, workstations, operators);
    
    await client.query('COMMIT');
    console.log('\n=== SEMILLA COMPLETADA CON ÉXITO ===');
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);