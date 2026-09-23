# ADR-009: NestJS en una sola versión mayor

**Fecha:** 2026-09-23
**Estado:** Aceptado
**Contexto:** Dependencias del monorepo

## Contexto

El backend declaraba `@nestjs/core@12` junto a `@nestjs/common@11`. El árbol
instalado tenía las dos versiones de `common`, y `npm install` fallaba por
conflicto de peers: había que instalar siempre con `npm ci`. La primera orden que
prueba cualquiera que clone el repositorio reventaba, y el CI funcionaba por
casualidad (usa `npm ci`).

## Decisión

Alinear a la **12**, que es la versión que ya pedían las dependencias satélite
(`@nestjs/bullmq@12`, `@nestjs/config@12`, `@nestjs/bull-shared@12`), y hacerlo sin
re-resolver el árbol entero: `npm install` una vez y revisar el diff del lock. El
lock solo perdió las entradas duplicadas de la 11 (25 líneas) y `npm ci` siguió en
0 vulnerabilidades.

## Alternativas evaluadas

| Alternativa | Pros | Contras | Decisión |
|---|---|---|---|
| Bajar `core` a la 11 | Menos cambio | Rompe con bullmq y config, que piden 12 | Descartada |
| `overrides` en la raíz | Fuerza la versión | Ya se usó para `js-cookie` y aquí no hacía falta: el problema era una declaración incoherente | Descartada |
| Documentar «usar `npm ci`» | Cero riesgo | Deja la trampa para el siguiente que clone | Descartada |
| Alinear a la 12 | Instalación estándar y dependencias coherentes | Un lock que hay que revisar | **Elegida** |

## Consecuencias

**Positivas:** `npm install` funciona; el árbol de NestJS es coherente; el CI y el
entorno local instalan lo mismo.

**Negativas:** el lock cambió, así que conviene mirar el diff al actualizar (regla
general: si el diff del lock es enorme, algo está re-resolviendo de más).

**Señal de revisión:** si Dependabot vuelve a subir una pieza del framework sin las
demás, o si `npm install` vuelve a fallar por peers.

## Archivos

- `backend/package.json`
- `package-lock.json`
