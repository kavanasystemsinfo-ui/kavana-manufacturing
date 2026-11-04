#!/usr/bin/env bash
# Render por escenas: cada tramo se persiste, así una interrupción no tira el trabajo.
# Concurrency 1 a propósito: con 2 pestañas de Chrome a 1080p este VPS (3,8 GB) entra
# en OOM y el kernel mata el render.
# Uso: bash scripts/render-scenes.sh
set -uo pipefail

cd "$(dirname "$0")/../remotion"
OUT_DIR="../out/segments"
mkdir -p "$OUT_DIR"

# inicio-fin (frames a 30 fps) por escena, según script.manufacturing.json
RANGES=(
  "0-299"
  "300-539"
  "540-839"
  "840-1199"
  "1200-1559"
  "1560-1859"
  "1860-2249"
  "2250-2699"
)

i=1
for R in "${RANGES[@]}"; do
  SEG="$OUT_DIR/scene-$i.mp4"
  if [ -s "$SEG" ]; then
    echo "· escena $i ya existe, se omite"
  else
    for attempt in 1 2 3; do
      echo "▶ escena $i ($R) intento $attempt"
      if npx remotion render src/index.ts ManufacturingVideo "$SEG" \
        --frames="$R" --concurrency=1; then
        break
      fi
      echo "✗ fallo en escena $i (intento $attempt)"
      rm -f "$SEG"
      sleep 5
    done
    [ -s "$SEG" ] || { echo "✗ escena $i no se pudo renderizar"; exit 1; }
  fi
  i=$((i + 1))
done

# Concatenar sin recodificar (mismos parámetros de codificación)
: > "$OUT_DIR/list.txt"
for f in $(ls "$OUT_DIR"/scene-*.mp4 | sort -V); do
  echo "file '$(basename "$f")'" >> "$OUT_DIR/list.txt"
done

ffmpeg -y -v error -f concat -safe 0 -i "$OUT_DIR/list.txt" -c copy ../out/manufacturing-90s.mp4
echo "✓ ../out/manufacturing-90s.mp4"
