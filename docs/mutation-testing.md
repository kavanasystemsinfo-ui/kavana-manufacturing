# Mutation testing (Stryker)

Qué mide: no cuántos tests pasan, sino cuántos **bugs reales** detectan. Stryker
introduce cambios pequeños en el código (mutantes: invertir una condición,
cambiar un operador, vaciar un bloque) y corre la suite. Un mutante **matado**
significa que algún test falló por el cambio, es decir, que hay un test que
protege ese comportamiento. Un mutante **superviviente** significa que la suite
pasó con el código roto: ese test no defiende nada de lo que dice defender.

## ⚠️ Aviso: el runner de Stryker miente con Vitest 5

Con `vitest@5` y `@stryker-mutator/vitest-runner@10`, **cualquier mutante que
tenga plan de tests filtrado se marca como superviviente sin haber ejecutado un
solo test**. El síntoma exacto en el informe:

```
Ran 0.00 tests per mutant on average.
All files | 0.00 | 0.00 | 0 killed | 0 timeout | 158 survived | 12 no cov
```

Causa, leída en el código del runner
(`@stryker-mutator/vitest-runner/dist/src/vitest-test-runner.js`): en la pasada
de un mutante llama a `ctx.start(<rutas absolutas de los ficheros del plan>)`;
con Vitest 5 eso no resuelve ningún fichero, lanza `VITEST_FILES_NOT_FOUND` y el
propio runner **se traga el error a propósito** ("no tests found, this isn't a
problem"). El estado de vitest queda vacío, no hay fallo que atribuir y el
mutante sale "superviviente". Con `--logLevel debug` la ejecución además revienta
con `TypeError: Converting circular structure to JSON` dentro de `init()`.

Consecuencia práctica: **un 0 % de mutación no es una medida, es un fallo de la
herramienta.** Nunca aceptar un informe con `0.00 tests per mutant`, y tratar con
pinzas las cifras absolutas de la primera pasada (122 matados / 17,6 %), porque
salieron del mismo runner.

### Cómo se mide de verdad mientras esto siga así

`backend/scripts/comprobar-mutantes.mjs` aplica cada mutante al fichero de
verdad, corre el spec y mira el código de salida. No paraleliza y es lento, pero
no miente:

```bash
cd backend
DATABASE_URL='postgresql://kavana:***@localhost:5435/kavana_test' \
  NPX_BIN=/usr/bin/npx node scripts/comprobar-mutantes.mjs \
  reports/mutation/mutation.json \
  src/core-mes-production/core-mes-production.service.ts \
  src/core-mes-production/core-mes-production.db.spec.ts
```

En este VPS `NPX_BIN=/usr/bin/npx` es obligatorio: el `npx` del PATH es el shim
de rtk. El script restaura siempre el fuente (la restauración va en un `finally`).

## Cómo correrlo

```bash
cd backend
DATABASE_URL='postgresql://kavana:kavana_e2e@localhost:5435/kavana_test' npx stryker run
# informe navegable: backend/reports/mutation/mutation.html
```

Necesita `DATABASE_URL` con una base de pruebas migrada: los specs de servicio
mockean el pool, pero los de integración ejecutan SQL de verdad. El job `test`
del CI prepara esa base (paso «Prepare test database», que aplica
`database/scripts/e2e-setup.js`); en local, `node database/scripts/e2e-setup.js`
contra una base propia. Una pasada completa tarda unos 130 minutos.

## Línea base (primera pasada, 2026-09-27) — cifras NO fiables

Primera pasada completa: 3.849 mutantes en 73 ficheros, 129 minutos.

| Métrica | Valor |
|---|---|
| Mutantes generados | 3.849 |
| Sin cobertura de tests | 2.068 (54%) |
| Matados | 122 |
| Timeout (cuentan como detectados) | 191 |
| Supervivientes | 1.468 |
| **Score sobre código cubierto** | **17,6%** |
| Score sobre el total | 8,1% |

**Esa pasada salió del runner roto** (ver el aviso de arriba): sirve como
inventario de mutantes y como mapa de dónde NO hay tests, no como nota.

### Dónde la suite sí tiene dientes

| Fichero | Score | Matados |
|---|---|---|
| `manufacturing-models/dto.ts` | 100% | 8 |
| `orders/dto.ts` | 100% | 4 |
| `workstations/dto.ts` | 100% | 5 |
| `global-admin.service.ts` | 100% | 6 |
| `core-mes-production/dto.ts` | 60,7% | 31 |
| `tenant-capabilities/audit-query.ts` | 43,5% | 16 |
| `common/custom-fields.ts` | 30,7% | 20 |

El patrón es claro: los esquemas de validación (zod) y las funciones puras se
comprueban bien, porque sus tests no mockean nada.

### Dónde no

| Fichero | Supervivientes | Matados |
|---|---|---|
| `core-mes-production/core-mes-production.service.ts` | 140 | 0 |
| `auth-login/auth-login.service.ts` | 135 | 7 |
| `incidencias/photo-validator.ts` | 115 | 4 |
| `users/users.service.ts` | 92 | 0 |
| `auth/jwt.service.ts` | 89 | 5 |

Solo 16 de los 73 ficheros tienen algún mutante matado. Los servicios de
dominio, que es donde vive la lógica de negocio del MES (el motor de
sincronización, el login con lockout, el validador de fotos), tienen centenares
de mutantes supervivientes.

### Por qué ocurre (la lección)

Los specs de servicio mockean el pool de PostgreSQL y comprueban la **forma** de
las llamadas (que se llamó a la función, con qué argumentos), no el
**resultado**. Con el pool mockeado, cambiar la lógica interna no altera ninguna
aserción, así que el mutante sobrevive aunque el test pase en verde. Es la misma
familia de fallo que destapó los dos P0 del sync en septiembre: una suite verde
que no ejecuta de verdad la consulta.

Los tests que sí matan son los de contrato y validación (DTOs, esquemas de
campos personalizados, guard de roles, `audit-query`), porque ejercitan la
función pura sin sustituirla.

## Segunda medida: el motor de producción (2026-09-27)

`core-mes-production.service.ts` es el motor del registro de producción, así que
fue el primero. Se midió mutante a mutante con `comprobar-mutantes.mjs` (no con
el runner) contra el spec de integración nuevo
(`core-mes-production.db.spec.ts`, 35 tests que ejecutan el SQL real).

| Ronda | Qué se añadió | Mutantes matados |
|---|---|---|
| 1 | Spec de integración: inserción y acumulación, replay sin duplicar, solape, parada, aislamiento por tenant, transiciones, campos personalizados, lecturas | 119 de 170 |
| 2 | Mensajes exactos de error, fallo de clave foránea, código de orden duplicado, tenant sin esquema de campos | +7 |
| 3 | Transición con identificador no casteable, y mensaje de solape comparado por **igualdad** y no por subcadena | +4 |
| **Total** | | **130 de 170 (76,5 %)** |

De los 40 que siguen vivos, ninguno es un hueco explotable:

- **Rama muerta (8)**: el guard «A workstation_id is required to start
  production» (`target_status === 'in_progress' && !dto.workstation_id &&
  !order.workstation_id`) es inalcanzable: `orders.workstation_id` es NOT NULL,
  así que la última condición siempre es falsa. Candidato a borrar; hoy no hay
  forma de testearlo.
- **Solo alcanzable con carrera (9)**: la rama `isNewBlock === false` (el `ON
  CONFLICT (tenant_id, event_fingerprint) DO NOTHING` de `insertWorkBlock` y su
  `rowCount > 0`) queda tapada por la comprobación previa de duplicado. Es
  defensa en profundidad contra dos transacciones simultáneas: matarla exigiría
  un test concurrente, con toda probabilidad inestable.
- **Mutantes equivalentes (23)**: el interior de la huella de deduplicación
  (`computeFingerprint`: ternarios por tipo y cantidades), un encadenamiento
  opcional sobre una columna NOT NULL, el fallback `Array.isArray(...) ? … : []`
  y los ternarios del INSERT. Cambiarlos no altera nada observable desde la API:
  la huella solo se compara consigo misma.

### Lección de método

Un `toThrow('<subcadena>')` puede dar por bueno el camino equivocado: el error
envuelto (`Sync operation failed: El bloque de tiempo se solapa…`) contiene el
mensaje del error original, así que la aserción pasaba aunque el código hubiera
envuelto un error que debía propagar. Para mensajes, comparar el texto **completo**.

## Configuración (`backend/stryker.conf.json` y `backend/vitest.config.ts`)

- `coverageAnalysis: off`: cada mutante corre la suite completa. Es la vía que
  funciona con este runner y `pool: forks`; a cambio, la pasada es lenta.
- `mutate`: todo `src/**` salvo specs, `main.ts` y `ai-advisor/**` (este último
  queda fuera a propósito: sus tests mockean el SDK de OpenAI y no aportarían
  señal).
- `reporters`: `html`, `json`, `clear-text`, `progress`. El `json` es el que
  alimenta `comprobar-mutantes.mjs`.
- `thresholds.break`: **null** por ahora. Estaba en 60 (puesto antes de tener
  ninguna cifra) y hacía fallar la pasada por definición. El umbral definitivo se
  fija cuando haya una cifra fiable por fichero.
- `backend/vitest.config.ts` usa `pool: 'forks'` + `fileParallelism: false`: los
  ficheros se ejecutan de uno en uno, que es lo que Stryker necesita para
  correlacionar mutación y test. `poolOptions.forks.singleFork` ya no existe en
  Vitest 5 (solo imprimía un aviso de deprecación y se ignoraba).
- `backend/reports/` está ignorado por git.

## Próximos pasos propuestos

1. Arreglar la medición: o un runner de Stryker compatible con Vitest 5, o bajar
   Vitest a 4 en el workspace del backend. Mientras tanto, medir con
   `comprobar-mutantes.mjs` y **no** publicar cifras del runner.
2. Seguir por orden de valor: `auth-login.service.ts` (135 supervivientes),
   `photo-validator.ts` (115: es función pura y ya tiene la ronda de contrato
   exacto) y `users.service.ts` (92). Los de login y usuarios necesitan el patrón
   de spec contra base de datos real; el de incidencias no.
3. Fijar `thresholds.break` por fichero cuando haya cifra fiable.
