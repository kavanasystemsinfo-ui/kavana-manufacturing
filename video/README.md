# Kavana Manufacturing — Pipeline de vídeo demo

Genera vídeos comerciales del SaaS Kavana Manufacturing grabando **la app real** con Playwright y montándola con Remotion (zooms, rótulos, subtítulos y música).

## Cómo regenerar el vídeo (3 comandos)

```bash
cd video

# 1. Dependencias (solo la primera vez)
npm install && npm --prefix remotion install && npx playwright install chromium

# 2. Grabar la demo real (≈2 min) y preparar artefactos para Remotion
npm run record && npm run prepare

# 3. Renderizar y verificar
npm run render && npm run verify
```

Salida: `video/out/manufacturing-90s.mp4` (1920×1080, 30 fps, 90 s).

## Estructura

```
video/
├── script.manufacturing.json   # Guion: 8 escenas / 90 s
├── record.ts                   # Playwright: entra por /demo y graba la app
├── playwright.config.ts
├── scripts/
│   ├── prepare-assets.mjs      # recordings/ → remotion/public + src/data
│   └── verify.mjs              # ffprobe + extracción de fotogramas
├── recordings/                 # (ignorado en git) salida de la grabación
│   ├── videos/*.webm
│   ├── timeline.json           # inicio/fin real de cada escena en la grabación
│   ├── click-positions.json
│   └── frame-<escena>.png      # 1 captura por escena
├── remotion/
│   ├── src/index.ts            # registerRoot
│   ├── src/Root.tsx            # Composition 1920×1080 · 2700 frames
│   ├── src/ManufacturingVideo.tsx
│   ├── src/data/{script,timeline}.json
│   └── public/{logo.png,recording.webm,timeline.json,music.mp3}
└── out/                        # MP4 final + fotogramas de verificación
```

## Demo usada

- URL base: **https://www.manufacturing.kavanasystems.com/demo** (con `www`; el dominio sin `www` no resuelve).
- No se usan dominios `*.vercel.app` (exigen SSO de Vercel).
- Entrada por el flujo propio de la página: botones **Operario / Supervisor / Administrador**. No se inyectan tokens.
- Solo datos de demo (tenant SnackPro). La grabación **no envía** el formulario de producción: solo navega, filtra y rellena campos locales.

Puedes apuntar a otro entorno con `BASE_URL=https://... npm run record`.

## Guion (`script.manufacturing.json`)

| # | Escena | Tiempo | Contenido |
|---|--------|--------|-----------|
| 1 | `intro` | 0–10 s | Portada de la demo + logo y propuesta de valor |
| 2 | `demo-login-operario` | 10–18 s | Clic real en «Operario» |
| 3 | `operator-panel-orders` | 18–28 s | Cola de órdenes y búsqueda |
| 4 | `operator-block-registration` | 28–40 s | Detalle de orden 4484 + calculadora de palets |
| 5 | `supervisor-panel-resumen` | 40–52 s | KPIs, Pareto de paradas y alertas |
| 6 | `supervisor-live-line` | 52–62 s | Línea en vivo: timeline del turno por puesto |
| 7 | `admin-panel-capabilities` | 62–75 s | Administración: usuarios y puestos |
| 8 | `outro-cta` | 75–90 s | CTA con la URL de la demo |

## Cómo funciona la grabación

1. Playwright abre `BASE_URL/demo`, limpia sesión y espera a que el backend (Render, free tier) despierte — hasta 60 s.
2. Recorre las escenas con clics lentos, guardando `timeline.json` (ms reales de cada escena) y `click-positions.json`.
3. Graba vídeo 1920×1080 con `recordVideo` y una captura por escena.

`prepare-assets.mjs` copia el `.webm` más reciente y el timeline al proyecto Remotion, de modo que el montaje use **el metraje exacto** de cada escena (`OffthreadVideo` con `startFrom`/`endAt`) en lugar de una única toma continua.

## Montaje

- Zoom lento hacia `zoomArea` de cada escena (1 → 1,14).
- Rótulo superior con el título y subtítulo inferior con la descripción.
- Intro y outro con capa de marca sobre el metraje.
- Barra de progreso.
- Audio: `remotion/public/music.mp3`.

### Música y licencias

`music.mp3` se **genera proceduralmente con ffmpeg** (senos armónicos + tremolo + filtros), sin samples de terceros:

```bash
ffmpeg -y -f lavfi -i "aevalsrc=0.055*sin(2*PI*110*t)+0.045*sin(2*PI*164.81*t)+0.035*sin(2*PI*220*t)+0.025*sin(2*PI*329.63*t)+0.02*sin(2*PI*440*t):s=44100:d=90" \
  -af "tremolo=f=0.12:d=0.35,lowpass=f=1600,highpass=f=55,afade=t=in:st=0:d=4,afade=t=out:st=84:d=6" \
  -c:a libmp3lame -b:a 128k remotion/public/music.mp3
```

Licencia: **CC0 / dominio público** (obra derivada de síntesis propia, sin material de terceros). No requiere atribución.

## Verificación

`npm run verify` comprueba con `ffprobe` resolución (1920×1080) y duración (85–95 s), y extrae 8 fotogramas a `out/frames/` (uno por escena) para revisar que no hay pantallas en blanco ni errores de login.

## Publicación

- Si el MP4 pesa **< 15 MB**, se copia a `frontend/public/videos/manufacturing-90s.mp4` en un **commit aparte** (revertible).
- Si pesa **≥ 15 MB**, no se versiona: se queda en `video/out/` y se sirve desde almacenamiento externo.

## Personalizar para otro producto

1. Copia `video/` al repo destino.
2. Ajusta `script.manufacturing.json` (URLs, escenas, `zoomArea`) y `record.ts` (selectores).
3. Sustituye `remotion/public/logo.png` y los colores en `ManufacturingVideo.tsx`.
4. Ejecuta los 3 comandos.

## Troubleshooting

| Síntoma | Causa / solución |
|---|---|
| `ERR_NAME_NOT_RESOLVED` | Falta el `www.` en la URL base |
| La demo tarda en cargar | Backend en Render dormido: `waitForApp` espera hasta 60 s |
| Los botones de rol no aparecen | Queda sesión abierta: `enterDemo()` limpia cookies y storage antes de entrar |
| `headed browser without XServer` | Ejecuta en headless (por defecto) o usa `xvfb-run` |
| `crf` y `videoBitrate` juntos | Remotion no permite ambos: usa solo `Config.setVideoBitrate` |
| Vídeo > 15 MB | Baja `Config.setVideoBitrate` en `remotion.config.ts` |

## Licencia

Código: MIT (igual que el repo principal). Grabaciones: datos de demo pública, sin datos de clientes.
