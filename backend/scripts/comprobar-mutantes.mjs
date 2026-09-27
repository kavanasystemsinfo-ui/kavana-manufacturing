// Mide a mano cuántos mutantes mata un spec, sin fiarse del runner de Stryker.
//
// Por qué existe: con vitest 5, @stryker-mutator/vitest-runner@10 devuelve
// "0.00 tests per mutant" y marca TODOS los mutantes como supervivientes cuando
// el mutante tiene plan de tests filtrado (su `ctx.start(files)` no resuelve y
// se come el VITEST_FILES_NOT_FOUND). El resultado se ve como una medida real
// ("0 matados") y no lo es. Este script aplica el mutante al fichero de verdad,
// corre el spec y mira el código de salida: es lento pero no miente.
//
// Uso:
//   DATABASE_URL=postgresql://... node scripts/comprobar-mutantes.mjs \
//     reports/mutation/mutation.json src/core-mes-production/core-mes-production.service.ts \
//     src/core-mes-production/core-mes-production.db.spec.ts
//
// En este VPS el `npx` del PATH es el shim de rtk: usar NPX_BIN=/usr/bin/npx.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const [reportPath, targetPath, specPath, outPath = 'reports/mutation/matados-a-mano.json'] = process.argv.slice(2);
if (!reportPath || !targetPath || !specPath) {
  console.error('Uso: node scripts/comprobar-mutantes.mjs <informe.json> <fichero> <spec> [salida.json]');
  process.exit(2);
}

const npx = process.env.NPX_BIN ?? 'npx';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const key = Object.keys(report.files).find((k) => basename(k) === basename(targetPath));
if (!key) {
  console.error(`El informe no incluye ${targetPath}`);
  process.exit(2);
}

const source = report.files[key].source;
const absoluteTarget = resolve(targetPath);
if (readFileSync(absoluteTarget, 'utf8') !== source) {
  console.error('El fuente del informe no coincide con el del disco: no se puede mutar por offsets.');
  process.exit(2);
}

/** Stryker da línea 1-based y columna 0-based. */
function offset(lengths, line, column) {
  let total = 0;
  for (let i = 0; i < line - 1; i += 1) total += lengths[i] + 1;
  return total + column - 1;
}

const lineLengths = source.split('\n').map((l) => l.length);
// Los NoCoverage también entran: la atribución de cobertura es justo lo que falla.
const mutants = report.files[key].mutants
  .filter((m) => m.status !== 'Killed')
  .sort((a, b) => a.location.start.line - b.location.start.line || a.location.start.column - b.location.start.column);

const results = [];
for (const [index, mutant] of mutants.entries()) {
  const { start, end } = mutant.location;
  const from = offset(lineLengths, start.line, start.column);
  const to = offset(lineLengths, end.line, end.column);
  const mutated = source.slice(0, from) + (mutant.replacement ?? '') + source.slice(to);

  let killed = null;
  try {
    writeFileSync(absoluteTarget, mutated);
    const run = spawnSync(npx, ['vitest', 'run', specPath, '--bail=1', '--reporter=dot'], {
      encoding: 'utf8',
      timeout: 120_000,
    });
    killed = run.status !== 0;
  } finally {
    // Nunca dejar el árbol mutado, pase lo que pase.
    writeFileSync(absoluteTarget, source);
  }

  results.push({
    id: mutant.id,
    mutator: mutant.mutatorName,
    line: start.line,
    column: start.column,
    static: mutant.static,
    strykerStatus: mutant.status,
    original: source.slice(from, to),
    replacement: mutant.replacement ?? '',
    killedBySpec: killed,
  });
  writeFileSync(outPath, JSON.stringify(results, null, 1));
  console.log(`[${index + 1}/${mutants.length}] L${start.line} ${mutant.mutatorName} matado=${killed}`);
}

const killed = results.filter((r) => r.killedBySpec).length;
console.log(`RESUMEN ${killed}/${results.length} mutantes que Stryker dio por supervivientes los mata el spec`);
console.log(`Detalle: ${existsSync(outPath) ? outPath : '(sin fichero)'}`);
