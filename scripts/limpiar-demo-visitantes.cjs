// Limpieza diaria de lo que crean los visitantes de la demo (T-099).
// Los botones públicos entran como operario 1094, supervisor 047 y admin de los
// tenants demo (1 y 100). Lo que ellos crean (órdenes, incidencias, fotos,
// sesiones de subida y bloques de trabajo) se borra al día siguiente para que
// la demo vuelva a su origen. El histórico antiguo NO se toca: solo se borra lo
// creado en los últimos DIAS_VENTANA días, y solo si lo creó uno de esos usuarios.
//
// Uso suelto: PGHOST=... PGPASSWORD=*** node scripts/limpiar-demo-visitantes.cjs
// También lo invoca simulate-daily-manufacturing.cjs antes de regenerar el día.

const TENANTS_DEMO = [1, 100];
const USUARIOS_PUBLICOS = ['1094', '047', 'admin'];
const DIAS_VENTANA = 3;
// Los usuarios que crea un visitante (el admin público puede darlos de alta) se
// quedaban para siempre: ningún borrado los cubría. Ventana más larga que la de
// órdenes para recoger también los de días en que la limpieza no corrió. Los
// usuarios de la demo se crearon en julio, agosto y octubre: quedan fuera. Si se
// vuelve a sembrar a alguien nuevo, protegerlo añadiéndolo a USUARIOS_PUBLICOS.
const DIAS_VENTANA_USUARIOS = 14;

/**
 * Borra los usuarios dados de alta por visitantes. Si alguno ya tiene actividad
 * (la clave foránea lo impide), no se borra: se desactiva para que ni entre ni lo
 * escoja el simulador. Devuelve cuántos se borraron y cuántos se desactivaron.
 */
async function limpiarUsuariosVisitantes(c, tenant) {
  const desde = new Date(Date.now() - DIAS_VENTANA_USUARIOS * 24 * 3600 * 1000);
  const r = await c.query(
    'SELECT id, username FROM users WHERE tenant_id=$1 AND created_at >= $2 AND NOT (username = ANY($3))',
    [tenant, desde, USUARIOS_PUBLICOS],
  );
  let borrados = 0;
  let desactivados = 0;
  for (const u of r.rows) {
    try {
      await c.query('DELETE FROM users WHERE tenant_id=$1 AND id=$2', [tenant, u.id]);
      borrados += 1;
    } catch (e) {
      if (e && e.code === '23503') {
        await c.query('UPDATE users SET is_active=false WHERE tenant_id=$1 AND id=$2', [tenant, u.id]);
        desactivados += 1;
      } else {
        throw e;
      }
    }
  }
  return { borrados, desactivados };
}

async function limpiarVisitantes(c) {
  const desde = new Date(Date.now() - DIAS_VENTANA * 24 * 3600 * 1000);
  const total = { incidencias: 0, uploads: 0, ordenes: 0, usuarios: 0, usuariosDesactivados: 0 };
  for (const tenant of TENANTS_DEMO) {
    const u = await c.query(
      'SELECT id FROM users WHERE tenant_id=$1 AND username = ANY($2)',
      [tenant, USUARIOS_PUBLICOS],
    );
    const ids = u.rows.map((r) => r.id);
    if (ids.length === 0) continue;

    // Sesiones de subida de foto (llevan los bytes de la foto) antes que la incidencia.
    const up = await c.query(
      'DELETE FROM incidencia_uploads WHERE tenant_id=$1 AND created_by = ANY($2) AND created_at >= $3',
      [tenant, ids, desde],
    );
    const inc = await c.query(
      'DELETE FROM incidencias WHERE tenant_id=$1 AND reported_by = ANY($2) AND created_at >= $3',
      [tenant, ids, desde],
    );
    // Órdenes de visitantes: primero sus bloques de trabajo (clave foránea).
    const ordIds = (await c.query(
      `SELECT id FROM orders WHERE tenant_id=$1 AND created_at >= $3 AND created_by = ANY($2::text[])`,
      [tenant, ids.map(String), desde],
    )).rows.map((r) => r.id);
    let ord = { rowCount: 0 };
    if (ordIds.length > 0) {
      await c.query('DELETE FROM production_work_blocks WHERE tenant_id=$1 AND order_id = ANY($2)', [tenant, ordIds]);
      ord = await c.query('DELETE FROM orders WHERE tenant_id=$1 AND id = ANY($2)', [tenant, ordIds]);
    }
    const us = await limpiarUsuariosVisitantes(c, tenant);
    total.usuarios += us.borrados;
    total.usuariosDesactivados += us.desactivados;
    total.uploads += up.rowCount;
    total.incidencias += inc.rowCount;
    total.ordenes += ord.rowCount;
  }
  console.log(`  • Visitantes limpiados: ${total.incidencias} incidencias, ${total.uploads} subidas de foto, ${total.ordenes} órdenes, ${total.usuarios} usuarios (${total.usuariosDesactivados} desactivados por tener actividad)`);
  return total;
}

module.exports = { limpiarVisitantes, limpiarUsuariosVisitantes };

if (require.main === module) {
  const { getClient } = require('./db.cjs');
  const c = getClient();
  c.connect()
    .then(() => limpiarVisitantes(c))
    .then(() => c.end())
    .catch((e) => { console.error('FATAL:', e.message.slice(0, 300)); process.exit(1); });
}
