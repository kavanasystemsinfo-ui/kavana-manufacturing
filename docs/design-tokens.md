# Design tokens: Kavana Manufacturing

Los colores, medidas y sombras de la interfaz, en un solo sitio, y el estado real
de su adopción. Los tokens viven en `frontend/tailwind.config.js` y las clases
compartidas en `frontend/src/utils/ui-tokens.ts`.

## Dos temas, un solo código

La aplicación tiene dos temas y cada color existe dos veces: el **clásico**, de ERP
(claro, denso, para quien viene de un MES tradicional), y el **moderno Kavana**
(oscuro, con más aire). El tema se elige con el conmutador y se recuerda entre
sesiones.

Eso significa que un color no es un valor, es un par. Y es la razón de que las
clases semánticas de `ui-tokens.ts` devuelvan las dos variantes en vez de un solo
valor: así el par se escribe una vez.

## Colores de marca

| Token | Valor | Uso |
|-------|-------|-----|
| `kavana-dark` | `#030712` | Fondo del tema moderno |
| `kavana-panel` | `#0B1329` | Superficie de paneles y tarjetas |
| `kavana-surface` | `#1F2937` | Superficie secundaria (tarjetas dentro de paneles) |
| `kavana-orange` | `#E17A47` | Color de acción principal (acento Kavana) |
| `kavana-orange-light` | `#F4A261` | Acento en hover y textos sobre fondo oscuro |
| `kavana-steel` | `#4B5563` | Bordes, separadores y texto secundario |

## Medidas y sombras

| Token | Valor | Por qué |
|-------|-------|---------|
| `min-h-touch-target` / `min-w-touch-target` | `64px` | Operarios con guantes industriales: los 44px estándar no se aciertan ([ADR-004](adr/004-ux-tunnel-vision.md)) |
| `shadow-kavana-glow` | `0 24px 80px rgba(225,122,71,0.18)` | Halo del acento, para destacar el elemento activo |

## Clases semánticas (estado)

| Clase | Uso |
|-------|-----|
| `alertClass('error' \| 'warning' \| 'success', isClassic)` | Avisos de la interfaz |

El aviso de error estaba copiado literalmente en seis pestañas, con sus dos
variantes de tema cada una: cualquier retoque había que hacerlo seis veces y
siempre quedaba alguna atrás. Ahora se pide la clase y el par se resuelve en un
sitio (`frontend/src/utils/ui-tokens.ts`, con su test).

## Estado de adopción (honesto)

- **514 usos de color directo** (`bg-gray-800`, `text-red-300`…) repartidos en
  **42 ficheros**, contados con `grep` sobre `frontend/src`.
- Migrado a tokens o clases semánticas: el aviso de error de las cuatro pestañas
  del panel de administración.
- **No se ha migrado el resto a propósito.** La mayoría de esos colores son de
  estado (verde = correcto, rojo = error, ámbar = aviso) y cambiarlos todos de una
  vez es un rediseño visual: cambia lo que ve el usuario y no es una decisión que
  deba tomar quien escribe el código sin consultarlo.
- **Camino para el resto**, en pasos revisables: (1) los estados de incidencia, que
  ya están duplicados en el tablero y en la lista; (2) los mapas de color por rol y
  por estado de orden; (3) el resto, fichero a fichero, verificando el aspecto en
  los dos temas.

## Cómo verificar un cambio aquí

1. `npm run test` en `frontend/` (los tokens tienen su spec).
2. `npm run build` para que Tailwind genere las clases nuevas.
3. Los E2E (`npm run test:e2e` desde la raíz), que recorren los dos temas.
4. Y mirar la pantalla en los dos temas antes de dar por bueno un cambio de color:
   un token que solo se comprueba en el tema moderno deja el clásico roto.
