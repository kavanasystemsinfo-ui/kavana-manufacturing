# ADR-007: Políticas de roles por método (el guard cierra por defecto)

**Fecha:** 2026-09-23
**Estado:** Aceptado
**Contexto:** Autorización de la API multi-tenant

## Contexto

El guard de roles es *fail-closed*: un endpoint sin `@RequireRole` devuelve 403 a
cualquiera, incluido el administrador del tenant. Eso es lo correcto, pero hace
que un permiso olvidado sea un endpoint muerto que no avisa a nadie. Siete
endpoints llevaban así sin que se notara:

- `GET /tenant/capabilities`, que el frontend pide en **todos** los paneles al
  arrancar. Con 403 el panel caía a su almacén local, así que un módulo
  desactivado seguía viéndose porque nadie le decía lo contrario.
- `GET /tenant/tooling-types`.
- Todo el CRUD de `/incidencias` y sus estadísticas: el módulo no podía listar,
  ver estadísticas ni crear nada.

## Decisión

Los permisos se declaran **por método**, con el rol mínimo que necesita cada
operación, y no por recurso entero:

| Recurso | Lectura | Escritura | Borrado |
|---|---|---|---|
| Catálogos (puestos, modelos, materiales, utillajes) | operario (lo que su panel pide), supervisor, admin | supervisor y admin | admin |
| Órdenes y partes | los tres | los tres (el operario registra) | admin |
| Incidencias | los tres (el operario ve las suyas) | el operario crea, supervisor y admin modifican | admin |
| Capacidades del tenant | los tres | admin | admin |
| Tipos de utillaje | supervisor y admin | admin | admin |

Se añade `backend/src/auth/roles-contract.spec.ts`, que recorre **todos** los
controllers y exige que cada endpoint declare política o esté en `PUBLIC_ROUTES`.
Es el test que encontró los siete endpoints mudos.

## Alternativas evaluadas

| Alternativa | Pros | Contras | Decisión |
|---|---|---|---|
| Guard abierto por defecto | Nada se rompe por olvido | Escalada de privilegios: ya hubo un incidente de operario → tenant_admin | Descartada |
| `@RequireRole` por clase | Menos ruido | El supervisor necesita más permisos que el operario en el mismo recurso | Descartada |
| Políticas por método + test de contrato | Seguridad por defecto y el olvido se detecta en CI | Un endpoint nuevo da 403 hasta que se declara | **Elegida** |

## Consecuencias

**Positivas:** la seguridad sigue siendo por defecto; el contrato de roles se
comprueba en cada PR y no cuando lo sufre un usuario; los permisos reflejan el
flujo real (el supervisor crea puestos y órdenes, el operario reporta).

**Negativas:** un endpoint nuevo sin política falla en cerrado y hay que acordarse
de declararla (mitigado por el test de contrato, que lo caza antes de desplegar).

**Señal de revisión:** si se añade un rol nuevo, o si un módulo empieza a dar 403
sin cambio aparente, mirar primero si su endpoint declara política.

## Archivos

- `backend/src/auth/roles.guard.ts` — guard y `PUBLIC_ROUTES`
- `backend/src/auth/roles-contract.spec.ts` — contrato de toda la API
- `backend/src/incidencias/incidencias.controller.ts`
- `backend/src/tenant-capabilities/tenant-capabilities.controller.ts`
