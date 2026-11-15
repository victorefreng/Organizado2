#!/bin/bash
# Cola secuencial de los mundos que faltan. Espera a que termine OCEAN para no
# pelearse por la CPU con el render que ya está corriendo.
cd "$(dirname "$0")"
CHROME=/opt/pw-browsers/chromium

echo "Esperando a que termine el render de OCEAN..."
while pgrep -f "render-ocean.sh" > /dev/null; do sleep 20; done
echo "OCEAN terminado. Sigo con el resto."

render () {  # $1=id composicion  $2=carpeta paquete  $3=archivo
  local out="../dist/packages/$2/$3"
  if [ -f "$out" ]; then echo "  ya existe $2/$3, salto"; return; fi
  mkdir -p "../dist/packages/$2"
  echo ""
  echo "=== $1 → $2/$3 ==="
  npx remotion render src/index.jsx "$1" "$out" \
    --browser-executable=$CHROME --concurrency=3 \
    --codec=h264 --crf=18 --pixel-format=yuv420p \
    --image-format=jpeg --jpeg-quality=95 --log=error || { echo "  FALLÓ $1"; return; }
  # El contrato exige GOP 30 y faststart
  ffmpeg -hide_banner -loglevel error -y -i "$out" -an \
    -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
    -r 30 -g 30 -keyint_min 30 -sc_threshold 0 \
    -x264-params "keyint=30:min-keyint=30:scenecut=0" \
    -movflags +faststart "${out}.tmp.mp4" && mv "${out}.tmp.mp4" "$out"
  echo "  listo $2/$3"
}

for par in "CLOUDS:AMBIENT-001" "JUNGLE:AMBIENT-003" "GALAXY:AMBIENT-004" "REDROOM:AMBIENT-005"; do
  mundo="${par%%:*}"; pkg="${par##*:}"
  render "$mundo-MAIN"    "$pkg" main.mp4
  render "$mundo-CEILING" "$pkg" ceiling.mp4
  render "$mundo-SIDE"    "$pkg" side.mp4
done

echo ""
echo "=== ensamblando y validando los cinco paquetes ==="
cd ..
for id in AMBIENT-001 AMBIENT-002 AMBIENT-003 AMBIENT-004 AMBIENT-005; do
  node tools/build-ambient-package.mjs "$id" || echo "  $id NO valida"
done
echo ""
echo "TODO TERMINADO"
