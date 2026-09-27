// Migra los datos de una base de la generación anterior (producción actual) a
// una base creada desde la cadena de migraciones.
//
// Por qué existe: producción (Neon) arrastra un esquema de julio, anterior a la
// cadena. Las migraciones no se pueden reaplicar encima (fallan contra objetos
// ya creados: `CREATE TRIGGER` sin `IF NOT EXISTS`), así que el camino es una
// base nueva desde la cadena y copiar los datos aquí.
//
// Uso:
//   LEGACY_PGHOST=... LEGACY_PGUSER=... LEGACY_PGPASSWORD=... LEGACY_PGDATABASE=neondb \
//   TARGET_PGHOST=... TARGET_PGUSER=... TARGET_PGPASSWORD=... TARGET_PGDATABASE=kavana_mes \
//   node database/scripts/migrar-desde-legacy.mjs [--dry-run] [--force]
//
// Qué NO se copia, y por qué:
//   - Los partes que se solapan con otro del mismo operario (4.180 de 5.384). La
//     generación anterior no lo impedía; el esquema nuevo sí (migración 038), así
//     que no caben. Se quedan en la base vieja, archivada.
//   - `event_fingerprint` de los partes históricos: se rellena a NULL. La huella
//     la calcula el navegador al enviar, inventarla sería falsear el dato.
//   - Las tablas de la generación anterior (`production_orders`,
//     `production_time_logs`) y las columnas basura de Supabase en `users`.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { applyGrants, applyMigrations } from './e2e-setup.js';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const ORDEN = [
  'tenants',
  'users',
  'toolings',
  'raw_materials',
  'workstations',
  'manufacturing_models',
  'orders',
  'production_work_blocks',
  'incidencias',
  'incidencia_uploads',
  'oee_metrics',
  'quality_checks',
  'cost_entries',
  'bom_items',
  'tenant_config_audit',
];

// Un parte entra solo si no se solapa con otro del mismo operario en la misma
// planta, que es la regla que el esquema nuevo impone.
const SOLO_PARTES_SIN_SOLAPE = `
  WHERE NOT EXISTS (
    SELECT 1 FROM production_work_blocks b2
    WHERE b2.tenant_id = b.tenant_id
      AND b2.operator_id = b.operator_id
      AND b2.id <> b.id
      AND b2.start_time < b.end_time
      AND b2.end_time > b.start_time
  )`;

// Columnas del destino que no existen en el origen, con la columna de origen que
// las alimenta. `registered_at` es obligatoria en el esquema nuevo: la fecha real
// del parte es `created_at` de la tabla vieja.
const EXTRAS = {
  production_work_blocks: { registered_at: 'created_at' },
};

const CONDICIONES = {
  production_work_blocks: SOLO_PARTES_SIN_SOLAPE,
};

function conexion(prefijo) {
  const url = process.env[`${prefijo}_DATABASE_URL`];
  if (url) return { connectionString: url };
  const host = process.env[`${prefijo}_PGHOST`];
  if (!host) {
    console.error(`Falta ${prefijo}_DATABASE_URL o ${prefijo}_PGHOST.`);
    process.exit(2);
  }
  return {
    host,
    port: Number(process.env[`${prefijo}_PGPORT`] ?? 5432),
    user: process.env[`${prefijo}_PGUSER`],
    password: process.env[`${prefijo}_PGPASSWORD`],
    database: process.env[`${prefijo}_PGDATABASE`],
    ssl: process.env[`${prefijo}_PGSSLMODE`] === 'require' ? { rejectUnauthorized: false } : undefined,
  };
}

async function columnas(client, tabla) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [tabla],
  );
  return rows.map((r) => r.column_name);
}

async function contar(client, tabla) {
  try {
    const { rows } = await client.query(`SELECT count(*)::int AS c FROM ${tabla}`);
    return rows[0].c;
  } catch {
    return null;
  }
}

// Tablas que la cadena siembra con una fila propia y hay que sustituir por la
// real: `tenants` es el caso (la cadena crea "Kavana Demo" sin subdominio; el
// tenant real de producción es el que da identidad al demo).
const REEMPLAZAR = new Set(['tenants']);

// La generación anterior creaba un pedido por día reutilizando el mismo código
// (15 códigos repetidos ~80 veces cada uno: 1.214 filas). El esquema nuevo exige
// `(tenant_id, code)` único, así que se desambigua con la fecha de creación en
// vez de descartar los pedidos, y los partes siguen apuntando al mismo `id`.
const AJUSTES = {
  orders(filas) {
    const veces = new Map();
    for (const fila of filas) {
      const clave = `${fila.tenant_id}|${fila.code}`;
      veces.set(clave, (veces.get(clave) ?? 0) + 1);
    }
    const usados = new Set();
    for (const fila of filas) {
      const clave = `${fila.tenant_id}|${fila.code}`;
      let codigo = fila.code;
      if (veces.get(clave) > 1 && fila.created_at) {
        const fecha = new Date(fila.created_at).toISOString().slice(0, 10).replace(/-/g, '');
        codigo = `${fila.code}-${fecha}`;
        let sufijo = 2;
        while (usados.has(`${fila.tenant_id}|${codigo}`)) {
          codigo = `${fila.code}-${fecha}-${sufijo}`;
          sufijo += 1;
        }
      }
      usados.add(`${fila.tenant_id}|${codigo}`);
      fila.code = codigo;
    }
    return filas;
  },
};

async function copiar(origen, destino, tabla, { dryRun, force, lote = 500 }) {
  const colsOrigen = await columnas(origen, tabla);
  const colsDestino = await columnas(destino, tabla);
  if (colsOrigen.length === 0 || colsDestino.length === 0) {
    console.log(`  ${tabla}: no existe en alguna de las dos bases, se omite`);
    return { tabla, copiadas: 0, origen: null, omitida: true };
  }

  // Las dos bases son servidores distintos: se lee del origen y se escribe en el
  // destino. `pares` lleva cada columna del destino a la del origen que la
  // alimenta (normalmente la misma, o `registered_at` desde `created_at`).
  const pares = colsDestino
    .filter((c) => colsOrigen.includes(c))
    .map((c) => ({ destino: c, origen: c }));
  for (const [colDestino, colOrigen] of Object.entries(EXTRAS[tabla] ?? {})) {
    pares.push({ destino: colDestino, origen: colOrigen });
  }

  const antesOrigen = await contar(origen, tabla);
  const antesDestino = await contar(destino, tabla);
  if (antesDestino > 0 && !force && !REEMPLAZAR.has(tabla)) {
    console.log(`  ${tabla}: el destino ya tiene ${antesDestino} filas, se omite (usa --force)`);
    return { tabla, copiadas: 0, origen: antesOrigen, omitida: true };
  }

  const condicion = CONDICIONES[tabla] ?? '';
  const { rows } = await origen.query(
    `SELECT ${pares.map((p) => `b.${p.origen}`).join(', ')} FROM ${tabla} b ${condicion}`,
  );
  if (AJUSTES[tabla]) AJUSTES[tabla](rows);

  if (dryRun) {
    console.log(`  ${tabla}: se copiarían ${rows.length} de ${antesOrigen}`);
    return { tabla, copiadas: rows.length, origen: antesOrigen, omitida: false, dryRun: true };
  }

  if (REEMPLAZAR.has(tabla) && antesDestino > 0) {
    const ids = rows.map((fila) => fila.id);
    const { rowCount } = await destino.query(`DELETE FROM ${tabla} WHERE id = ANY($1::bigint[])`, [ids]);
    console.log(`  ${tabla}: sustituidas ${rowCount} filas sembradas por la cadena`);
  }

  let insertadas = 0;
  for (let i = 0; i < rows.length; i += lote) {
    const valores = [];
    const grupos = rows.slice(i, i + lote).map((fila) => {
      const marcadores = pares.map((p) => {
        valores.push(fila[p.origen] ?? null);
        return `$${valores.length}`;
      });
      return `(${marcadores.join(', ')})`;
    });
    await destino.query(
      `INSERT INTO ${tabla} (${pares.map((p) => p.destino).join(', ')}) VALUES ${grupos.join(', ')}`,
      valores,
    );
    insertadas += grupos.length;
  }

  console.log(`  ${tabla}: ${antesOrigen} en origen -> ${insertadas} copiadas`);
  return { tabla, copiadas: insertadas, origen: antesOrigen, omitida: false };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  // `--limpiar` vacía el destino antes de copiar: la cadena siembra un tenant y
  // algún pedido de ejemplo que chocan con los datos reales (clave única por
  // código de pedido). Se borra en orden inverso al de las claves ajenas.
  const limpiar = process.argv.includes('--limpiar');
  const force = process.argv.includes('--force') || limpiar;
  const origen = new Client(conexion('LEGACY'));
  const destino = new Client(conexion('TARGET'));
  await origen.connect();
  await destino.connect();

  try {
    if (!dryRun) {
      console.log('[migracion] aplicando la cadena de migraciones al destino');
      await applyMigrations(destino);
      await applyGrants(destino);
    }

    if (limpiar && !dryRun) {
      console.log('[migracion] vaciando el destino (datos sembrados por la cadena)');
      for (const tabla of [...ORDEN].reverse()) {
        try {
          const { rowCount } = await destino.query(`DELETE FROM ${tabla}`);
          if (rowCount) console.log(`  ${tabla}: ${rowCount} filas borradas`);
        } catch (error) {
          console.log(`  ${tabla}: no se pudo vaciar (${error.message})`);
        }
      }
    }

    console.log(`[migracion] copiando datos${dryRun ? ' (simulación)' : ''}`);
    const resultados = [];
    for (const tabla of ORDEN) {
      resultados.push(await copiar(origen, destino, tabla, { dryRun, force }));
    }

    const omitidas = resultados.filter((r) => !r.omitida).reduce((a, r) => a + (r.origen ?? 0) - r.copiadas, 0);
    console.log(`[migracion] terminado. Filas que se quedan en la base archivada: ${omitidas}`);
  } finally {
    await origen.end();
    await destino.end();
  }
}

main().catch((error) => {
  console.error('[migracion] error:', error.message);
  process.exit(1);
});
