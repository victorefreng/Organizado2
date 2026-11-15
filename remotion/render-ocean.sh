#!/bin/bash
# Renderiza las tres pantallas de AMBIENT-002 OCEAN al formato de entrega.
set -e
cd "$(dirname "$0")"
OUT=../dist/packages/AMBIENT-002
mkdir -p "$OUT"
for comp in MAIN:main CEILING:ceiling SIDE:side; do
  id="OCEAN-${comp%%:*}"
  file="${comp##*:}.mp4"
  echo ""
  echo "=== $id → $file ==="
  npx remotion render src/index.jsx "$id" "$OUT/$file" \
    --browser-executable=/opt/pw-browsers/chromium \
    --concurrency=3 \
    --codec=h264 --crf=18 --pixel-format=yuv420p \
    --image-format=jpeg --jpeg-quality=95 \
    --log=error
  # El contrato exige un fotograma clave por segundo y faststart
  ffmpeg -hide_banner -loglevel error -y -i "$OUT/$file" \
    -an -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
    -r 30 -g 30 -keyint_min 30 -sc_threshold 0 \
    -x264-params "keyint=30:min-keyint=30:scenecut=0" \
    -movflags +faststart "$OUT/_$file"
  mv "$OUT/_$file" "$OUT/$file"
  echo "  → $OUT/$file"
done
