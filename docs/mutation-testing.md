# Mutation testing (Stryker)

Qué mide: no cuántos tests pasan, sino cuántos **bugs reales** detectan. Stryker
introduce cambios pequeños en el código (mutantes: invertir una condición,
cambiar un operador, vaciar un bloque) y corre la suite. Un mutante **matado**
significa que algún test falló por el cambio, es decir, que hay un test que
protege ese comportamiento. Un mutante **superviviente** significa que la suite
pasó con el código roto: ese test no defiende nada de lo que dice defender.

## Cómo correrlo

```bash
cd backend
DATABASE_URL='postgresql://kavana:kavana_e2e@localhost:5435/kavana_test' npx stryker run
# informe navegable: backend/reports/mutation/mutation.html
```

Necesita `DATABASE_URL` con una base de pruebas migrada (los specs de este repo
mockean el pool, pero varios tocan la BD real). Una pasada completa tarda unos
130 minutos con la configuración actual.

## Línea base (primera pasada, 2026-09-27)

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

El score sobre código cubierto es la cifra honesta comparable: un 17,6% quiere
decir que de cada seis mutantes que la suite llega a ejecutar, cinco pasan
desapercibidos.

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

## Configuración (`backend/stryker.conf.json`)

- `coverageAnalysis: off`: cada mutante corre la suite completa. Es la vía que
  funciona con el runner de vitest y `pool: forks` + `singleFork: true`; a
  cambio, la pasada es lenta. `perTest` aceleraría mucho la ejecución, pero hay
  que verificarlo con este runner antes de adoptarlo.
- `mutate`: todo `src/**` salvo specs, `main.ts` y `ai-advisor/**` (este último
  queda fuera a propósito: sus tests mockean el SDK de OpenAI y no aportarían
  señal).
- `reporters`: `html`, `json`, `clear-text`, `progress`. El `json` se añadió
  después de la primera pasada, porque el informe sólo en HTML obliga a
  extraerlo a mano.
- `thresholds.break`: **null** por ahora. Estaba en 60 (puesto antes de tener
  ninguna cifra) y hacía fallar la pasada por definición. El umbral definitivo
  se decide con Jorge sobre la línea base real; un `break` por encima del score
  actual convierte cada pasada en un rojo garantizado.

## Próximos pasos propuestos

1. Atacar por orden de valor: `core-mes-production.service.ts` primero (es el
   motor del registro de producción), después `auth-login.service.ts`,
   `photo-validator.ts` y `users.service.ts`.
2. Los tests que faltan no son de UI: son de servicio contra base de datos real,
   del mismo tipo que el E2E de flujo completo. El repo ya tiene el patrón
   montado (`database/scripts/e2e-setup.js` y el job `e2e` del CI).
3. Valorar `coverageAnalysis: perTest` para bajar los 130 minutos por pasada.
4. Fijar `thresholds.break` cuando el score suba lo suficiente como para que el
   umbral proteja en vez de bloquear.
