# ADR-008: La huella del parte se comprueba antes que el solape

**Fecha:** 2026-09-23
**Estado:** Aceptado
**Contexto:** Sincronización de partes de producción desde el HMI

## Contexto

El motor de sincronización del panel de operario puede reenviar un bloque que ya
se había registrado (dos ciclos solapados del motor, o un reintento). El backend
comprobaba primero el **solape de horarios** del operario y después si el bloque
ya existía. Resultado: el reenvío chocaba con el bloque que él mismo acababa de
crear y devolvía 400.

Lo grave no era el 400 en sí, sino dónde se veía: el parte **sí estaba
registrado**, pero al operario le aparecía un fallo en su bandeja. Un error falso
en planta hace que alguien vuelva a registrar producción o llame al supervisor sin
motivo.

## Decisión

Antes de mirar solapes, comprobar si ese hecho de producción ya está registrado,
por su huella semántica (`computeFingerprint`: hash de tenant, orden, operario,
tipo, tramo horario y cantidades). Si está, la respuesta es «ya sincronizado», no
un error, y no se vuelve a sumar producción.

El orden importa: la huella identifica el hecho; el solape es una regla de
negocio para hechos **distintos** que no pueden coexistir.

## Alternativas evaluadas

| Alternativa | Pros | Contras | Decisión |
|---|---|---|---|
| Subir el timeout del cliente | Cambio de una línea | No arregla nada: el 400 seguiría ahí | Descartada |
| Deduplicar en el frontend | Menos llamadas | El backend no puede confiar en el cliente; el reenvío seguiría dando error | Descartada |
| Responder 409 y que el cliente lo ignore | Rápido | Deja el error en el protocolo y la bandeja se sigue ensuciando | Descartada |
| Huella antes del solape | El reenvío es idempotente y no hay falso fallo | Ninguna relevante | **Elegida** |

## Consecuencias

**Positivas:** el reenvío de un parte es idempotente; el operario no ve fallos que
no han ocurrido; la producción no se duplica.

**Negativas (deuda anotada):** la huella incluye las fechas **como texto**, así que
dos formatos del mismo instante (`+00:00` y `.000Z`) producen huellas distintas.
Hoy no molesta porque el reenvío manda el mismo objeto, pero al reproducir un
reenvión por API hay que enviar el mismo formato o no se reproduce.

**Señal de revisión:** si algún día se normalizan las fechas del bloque antes de
calcular la huella, esta deuda desaparece.

## Archivos

- `backend/src/core-mes-production/core-mes-production.service.ts`
- `frontend/src/store/hmi-store.ts`: motor de sincronización
- `frontend/e2e/full-flow.spec.ts`: el flujo que lo destapó
