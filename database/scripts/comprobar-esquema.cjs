// Comprueba que una base de datos tiene el esquema que espera la cadena de
// migraciones. Existe por un fallo real: producción llevaba desde agosto con un
// esquema de una generación anterior (sin `observations` ni `event_fingerprint`)
// y el registro de partes del operario llevaba roto desde entonces, mientras la
// suite y el CI seguían en verde porque crean sus bases desde la cadena.
//
// Solo lee `information_schema`: se puede lanzar contra producción sin riesgo.
//
// Uso:
//   DATABASE_URL='postgresql://...' node database/scripts/comprobar-esquema.cjs
//   DATABASE_URL='postgresql://...' node database/scripts/comprobar-esquema.cjs --generar
//
// Con --generar, en vez de comparar, escribe el esquema de esa base como
// referencia (database/expected-schema.json). Se genera contra una base recién
// creada con la cadena aplicada (database/scripts/e2e-setup.js).
//
// Códigos de salida: 0 sin deriva (o con solo columnas de más), 1 deriva que
// rompe al código (tabla o columna que falta, tipo distinto), 2 error de uso.

const { readFileSync, writeFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { Client } = require('pg');

const EXPECTED_PATH = resolve(__dirname, '..', 'expected-schema.json');

// Igual que backend/src/db/postgres.provider.ts: se admite DATABASE_URL o las
// variables sueltas PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE (con las que está
// configurado el servicio de producción).
function connectionConfig() {
  if (process.env.PGHOST) {
    return {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER ?? 'postgres',
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE ?? 'postgres',
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    };
  }
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  console.error('Falta DATABASE_URL (o PGHOST + PGUSER + PGPASSWORD + PGDATABASE).');
  process.exit(2);
}

// `character varying` sin longitud y `text` son el mismo tipo en Postgres para
// lo que nos importa: normalizarlos evita falsas alarmas.
function normalizarTipo(dataType) {
  return dataType === 'character varying' ? 'text' : dataType;
}

async function dumpSchema(client) {
  const { rows } = await client.query(`
    SELECT c.table_name, c.column_name, c.data_type, c.is_nullable
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
     ORDER BY c.table_name, c.column_name
  `);

  const schema = {};
  for (const row of rows) {
    schema[row.table_name] ??= {};
    schema[row.table_name][row.column_name] = normalizarTipo(row.data_type);
  }
  return schema;
}

async function main() {
  const generar = process.argv.includes('--generar');
  const client = new Client(connectionConfig());
  await client.connect();

  let schema;
  try {
    schema = await dumpSchema(client);
  } finally {
    await client.end();
  }

  if (generar) {
    const json = JSON.stringify(schema, null, 1) + '\n';
    writeFileSync(EXPECTED_PATH, json);
    const columnas = Object.values(schema).reduce((total, cols) => total + Object.keys(cols).length, 0);
    console.log(`Esquema de referencia escrito en ${EXPECTED_PATH}: ${Object.keys(schema).length} tablas, ${columnas} columnas.`);
    return 0;
  }

  const expected = JSON.parse(readFileSync(EXPECTED_PATH, 'utf8'));
  const faltanTablas = [];
  const faltanColumnas = [];
  const tiposDistintos = [];
  const deMas = [];

  for (const [tabla, columnas] of Object.entries(expected)) {
    if (!schema[tabla]) {
      faltanTablas.push(tabla);
      continue;
    }
    for (const [columna, tipo] of Object.entries(columnas)) {
      const tipoEsperado = normalizarTipo(tipo);
      if (!(columna in schema[tabla])) {
        faltanColumnas.push(`${tabla}.${columna}`);
      } else if (schema[tabla][columna] !== tipoEsperado) {
        tiposDistintos.push(`${tabla}.${columna} es ${schema[tabla][columna]}, se espera ${tipoEsperado}`);
      }
    }
    for (const columna of Object.keys(schema[tabla])) {
      if (!(columna in columnas)) deMas.push(`${tabla}.${columna}`);
    }
  }
  for (const tabla of Object.keys(schema)) {
    if (!(tabla in expected)) deMas.push(`${tabla} (tabla entera)`);
  }

  const rompe = faltanTablas.length + faltanColumnas.length + tiposDistintos.length;

  console.log(`Tablas: ${Object.keys(schema).length} en la base, ${Object.keys(expected).length} esperadas.`);
  if (faltanTablas.length) console.log(`\nTABLAS QUE FALTAN (${faltanTablas.length}):\n  ${faltanTablas.join('\n  ')}`);
  if (faltanColumnas.length) console.log(`\nCOLUMNAS QUE FALTAN (${faltanColumnas.length}):\n  ${faltanColumnas.join('\n  ')}`);
  if (tiposDistintos.length) console.log(`\nTIPOS DISTINTOS (${tiposDistintos.length}):\n  ${tiposDistintos.join('\n  ')}`);
  if (deMas.length) console.log(`\nCOLUMNAS/TABLAS DE MÁS (${deMas.length}, no rompen nada):\n  ${deMas.join('\n  ')}`);

  if (rompe) {
    console.error(`\nDERIVA: ${rompe} diferencias que rompen el código frente a la cadena de migraciones.`);
    return 1;
  }
  console.log('\nSin deriva: el esquema coincide con el que espera la cadena.');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(2);
  });
